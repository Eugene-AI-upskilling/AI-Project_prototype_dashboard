# -*- coding: utf-8 -*-
"""네이버 증권(stock.naver.com) 종목분석 리포트 수집 → PDF 본문 → 애널리스트·요약 → 캐시 + HTML 대시보드.

  python naver_reports.py                  # 최근 2일치 수집·요약 후 output/analyst_reports.html 생성
  python naver_reports.py --days 5         # 최근 5일
  python naver_reports.py --query 삼성전자  # 특정 종목/키워드만 (최근 --pages 페이지)
  python naver_reports.py --no-llm         # Claude 요약 없이 (네이버 요약문으로 대체)

네이버 금융(finance.naver.com/research)은 stock.naver.com 으로 302 이동했고, 새 사이트는
아래 JSON API 를 쓴다. 목록 API 에 요약문·목표가가, 상세 API 에 PDF 주소·직전 목표가가 있다.
애널리스트 이름은 어디에도 없어서 PDF 1~2페이지 텍스트에서 뽑는다(정규식 → Claude 보정).
"""
import argparse
import datetime as dt
import html
import io
import json
import os
import re
import sys
import threading
from concurrent.futures import ThreadPoolExecutor

import requests

BASE = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE, "data", "reports.json")
TEMPLATE_PATH = os.path.join(BASE, "dashboard_template.html")
OUTPUT_PATH = os.path.join(BASE, "output", "analyst_reports.html")

API = "https://stock.naver.com/api/stockSecurity/researches/v2/company"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
           "Referer": "https://stock.naver.com/research/company"}
PAGE_SIZE = 50

# 기존 InsightLab 파이프라인의 Claude 호출 모듈 재사용 (키 탐색·거절 폴백 포함)
sys.path.insert(0, os.path.join(os.path.dirname(BASE), "yujin-research-center", "db_loader"))
try:
    import llm
except Exception:   # 모듈이 없으면 요약 없이 동작
    llm = None

_session = requests.Session()
_session.headers.update(HEADERS)
_lock = threading.Lock()


# ───────────────────────── 네이버 API ─────────────────────────
def fetch_list(index=0, size=PAGE_SIZE, query=None, broker_codes=None, start=None, end=None, item_codes=None):
    """query 는 제목·본문 전문검색이라 종목 검색엔 item_codes(종목코드 목록)를 쓴다."""
    params = {"index": index, "size": size}
    if query:
        params["query"] = query
    if item_codes:
        params["itemCodes"] = list(item_codes)   # 코드 목록은 itemCodes=A&itemCodes=B 처럼 반복 (쉼표 구분은 400)
    if broker_codes:
        params["brokerCodes"] = list(broker_codes)
    if start:
        params["startDate"] = start
    if end:
        params["endDate"] = end
    r = _session.get(API, params=params, timeout=15)
    r.raise_for_status()
    return r.json()


def fetch_detail(nid):
    r = _session.get(f"{API}/{nid}", timeout=15)
    r.raise_for_status()
    return r.json()


def list_reports(query=None, broker_codes=None, start=None, end=None, max_pages=10, item_codes=None):
    """조건에 맞는 리포트 목록(메타만). 최신순."""
    out = []
    for page in range(max_pages):
        d = fetch_list(page, PAGE_SIZE, query, broker_codes, start, end, item_codes)
        out.extend(d.get("items") or [])
        if not d.get("hasNext"):
            break
    return out


def resolve_stocks(term, limit=8):
    """종목명/코드 → 종목코드 목록 (네이버 증권 자동완성). 정확히 같은 이름이 있으면 그것만."""
    if re.fullmatch(r"\d{6}", term):
        return [term]
    try:
        r = _session.get("https://ac.stock.naver.com/ac", params={"q": term, "target": "stock"}, timeout=10)
        items = [i for i in r.json().get("items", []) if i.get("nationCode") == "KOR"]
    except Exception as e:
        print(f"  ⚠ 종목 검색 실패 '{term}': {e}")
        return []
    exact = [i["code"] for i in items if i["name"].replace(" ", "").lower() == term.replace(" ", "").lower()]
    return exact or [i["code"] for i in items[:limit]]


# ───────────────────────── PDF → 텍스트 ─────────────────────────
def pdf_text(url, pages=2):
    if not url:
        return ""
    try:
        data = _session.get(url, timeout=30).content
        import fitz   # PyMuPDF — pypdf 보다 빠르고 한글 표 추출이 덜 깨짐
        with fitz.open(stream=data, filetype="pdf") as doc:
            return "\n".join(doc[i].get_text() for i in range(min(pages, doc.page_count)))
    except Exception as e:
        print(f"  ⚠ PDF 읽기 실패 {url}: {e}")
        return ""


_NOT_NAME = {"투자의견", "목표주가", "현재주가", "시가총액", "유지", "매수", "중립", "상향", "하향", "연구원", "연구위원",
             "애널리스트", "리서치", "센터", "본부", "팀장", "책임", "선임", "수석", "담당", "전략", "기업분석",
             "차전지", "반도체", "자동차", "제약", "바이오", "화학", "조선", "기계", "건설", "금융", "은행", "보험",
             "유통", "통신", "미디어", "게임", "인터넷", "운송", "철강", "정유", "전기", "전자", "소재", "부품",
             "기업", "원전", "인프라", "전기전자", "추가", "지주", "정보", "기술", "성장", "가치", "산업",
             "배터리", "전망", "실적", "분석", "투자", "증권", "연구", "이익", "매출", "수익", "시장", "주가", "목표"}
# 한국 성씨 — '바이오'·'창업' 같은 섹터명/단어가 이름으로 잡히는 걸 거른다
_SURNAMES = set("김이박최정강조윤장임한오서신권황안송류유전홍고문양손배백허남심노하곽성차주우구민진나지엄채원천방"
                "공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예봉경")


def _is_name(n):
    if not n or n in _NOT_NAME:
        return False
    if len(n) == 4:   # 4글자는 복성(남궁·황보·제갈·선우·독고)만 — '기초과학'·'한세실업' 같은 단어 제외
        return n[:2] in ("남궁", "황보", "제갈", "선우", "독고")
    return len(n) in (2, 3) and n[0] in _SURNAMES


def guess_analysts(text):
    """PDF 첫 페이지에서 애널리스트 이름 후보 추출. 증권사마다 표기가 달라 몇 가지 패턴을 같이 본다.
    예) 'Analyst 권지우 jiwoo@...', 'RA 김형준', '최승환 연구위원', '[건설/원전] 이상호 3771-9733 id@...',
        '김민정 제약·바이오 02-709-2656 id@...'"""
    names = []

    def add(n):
        if _is_name(n) and n not in names and len(names) < 4:
            names.append(n)

    for m in re.finditer(r"(?:Analyst|RA)[ \t]*[:：]?[ \t]*([가-힣]{2,4})(?![가-힣])", text):
        add(m.group(1))
    for m in re.finditer(r"(?<![가-힣])([가-힣]{2,4})[ \t]*(?:수석|책임|선임)?[ \t]*(?:연구위원|연구원|애널리스트)", text):
        add(m.group(1))
    for m in re.finditer(r"[\w.\-]+@[\w\-]+\.[\w.]+", text):   # 이메일 같은 줄 또는 위 2~3줄 안의 한글 이름
        same = re.search(r"(?<![가-힣])([가-힣]{2,4})\s*[/|]\s*$", text[max(0, m.start() - 30):m.start()])
        if same and _is_name(same.group(1)):   # '이선경 / id@...'
            add(same.group(1))
            continue
        lines = text[max(0, m.start() - 120):m.start()].split("\n")[-4:]
        for line in reversed(lines):   # '김민정 제약·바이오', '건설/부동산 류태환' — 섹터명은 _is_name 이 거른다
            hit = next((n for n in re.findall(r"(?<![가-힣])([가-힣]{2,4})(?![가-힣])", line) if _is_name(n)), None)
            if hit:
                add(hit)
                break
    return names


# ───────────────────────── 요약 ─────────────────────────
def strip_html(s):
    s = re.sub(r"<br\s*/?>|</p>", "\n", s or "")
    s = re.sub(r"<[^>]+>", "", s)
    return re.sub(r"\n{2,}", "\n", html.unescape(s)).strip()


SUMMARY_SCHEMA = {
    "type": "object",
    "properties": {
        "analysts": {"type": "array", "items": {"type": "string"},
                     "description": "리포트 작성 애널리스트/RA 한글 이름. 못 찾으면 빈 배열"},
        "headline": {"type": "string", "description": "핵심을 한 문장(40자 내외)으로"},
        "points": {"type": "array", "items": {"type": "string"},
                   "description": "투자 포인트 3개. 숫자(실적·밸류에이션) 포함, 각 60자 이내"},
        "risk": {"type": "string", "description": "리포트가 언급한 리스크/체크포인트 한 문장. 없으면 빈 문자열"},
        "sentiment": {"type": "string", "enum": ["긍정", "중립", "부정"]},
    },
    "required": ["analysts", "headline", "points", "risk", "sentiment"],
    "additionalProperties": False,
}

SYSTEM = ("너는 증권사 리서치센터의 시니어 RA다. 종목분석 리포트를 읽고 바쁜 투자자가 30초 안에 "
          "읽을 수 있게 요약한다. 리포트에 없는 내용은 만들지 않고, 숫자는 원문 그대로 쓴다. "
          "문장은 '~전망', '~추정'처럼 간결한 개조식으로.")


def fallback_summary(rep):
    """Claude 를 못 쓸 때: 네이버 게시 요약문에서 소제목·앞 3문장을 뽑는다."""
    lines = [re.sub(r"^[-•·▶■□○●◆◼*\"“”'\s]+", "", l).strip() for l in strip_html(rep.get("content")).split("\n")]
    lines = [l for l in lines if l]
    # 첫 줄이 짧으면 증권사가 단 소제목, 길면 본문이라 제목을 한 줄 요약으로 쓴다
    has_head = len(lines) > 1 and len(lines[0]) <= 70
    sents = []
    for l in lines[1:] if has_head else lines:
        sents += [s.strip() for s in re.split(r"(?<=[다음함됨임])\.\s*", l) if len(s.strip()) > 8]
    return {
        "headline": lines[0] if has_head else rep.get("title", ""),
        "points": [s.rstrip(".") for s in sents[:3]],
        "risk": "",
        "sentiment": {"buy": "긍정", "sell": "부정"}.get(rep.get("opinionType"), "중립"),
        "by": "naver",
    }


def summarize(rep, text):
    """Claude 로 요약 + 애널리스트 이름 보정. 실패하면 네이버 요약문 기반 추출식 요약."""
    if llm is None or not llm.available():
        return fallback_summary(rep)
    user = (f"종목: {rep['itemName']} ({rep['itemCode']})\n증권사: {rep['brokerName']}\n"
            f"제목: {rep['title']}\n투자의견: {rep.get('opinionText')}  목표가: {rep.get('goalPrice')}"
            f" (직전 {rep.get('prevGoalPrice')})\n\n[네이버 게시 요약]\n{strip_html(rep.get('content'))}\n\n"
            f"[PDF 앞부분 텍스트]\n{text[:7000]}")
    try:
        out = llm.json_out(SYSTEM, user, SUMMARY_SCHEMA, max_tokens=2000, effort="low")
    except Exception as e:
        print(f"  ⚠ Claude 요약 실패 nid={rep['nid']}: {str(e)[:120]}")
        out = None
    if not out:
        return fallback_summary(rep)
    out["by"] = "claude"
    return out


# ───────────────────────── 캐시 ─────────────────────────
def load_cache():
    if os.path.exists(DATA_PATH):
        with open(DATA_PATH, encoding="utf-8") as f:
            return json.load(f)
    return {"reports": {}, "updated": None}


def save_cache(cache):
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    cache["updated"] = dt.datetime.now().strftime("%Y-%m-%d %H:%M")
    tmp = DATA_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False)
    os.replace(tmp, DATA_PATH)


def _num(v):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return None


def enrich(item, cache, use_llm=True):
    """목록 item → 상세 + PDF + 애널리스트 + 요약을 채운 레코드 (캐시에 있으면 재사용)."""
    nid = str(item["nid"])
    rec = cache["reports"].get(nid)
    if rec and (rec.get("summary", {}).get("by") == "claude" or not use_llm):
        return rec
    if not rec:
        try:
            d = fetch_detail(nid)
        except Exception as e:
            print(f"  ⚠ 상세 조회 실패 nid={nid}: {e}")
            d = {}
        rec = {
            "nid": nid,
            "title": item.get("title"),
            "itemName": item.get("itemName"),
            "itemCode": item.get("itemCode"),
            "brokerName": item.get("brokerName"),
            "brokerCode": item.get("brokerCode"),
            "writeDate": item.get("writeDate"),
            "readCount": _num(item.get("readCount")),
            "opinionText": item.get("opinionText") or "",
            "opinionType": item.get("opinionType") or "",
            "goalPrice": _num(item.get("goalPrice")),
            "prevGoalPrice": _num(d.get("prevGoalPrice")),
            "priceAtWriteDate": _num(d.get("priceAtWriteDate")),
            "pdfUrl": d.get("attachUrl"),
            "content": strip_html(item.get("content")),
            "url": f"https://stock.naver.com/research/company/{nid}",
        }
    text = pdf_text(rec.get("pdfUrl"))
    regex_names = guess_analysts(text)
    rec["summary"] = summarize(dict(rec, content=item.get("content") or rec["content"]), text) \
        if use_llm else fallback_summary(dict(rec, content=item.get("content") or rec["content"]))
    llm_names = [n for n in rec["summary"].pop("analysts", []) if re.fullmatch(r"[가-힣]{2,4}", n or "")]
    rec["analysts"] = llm_names or regex_names
    with _lock:
        cache["reports"][nid] = rec
    return rec


def collect(items, cache, use_llm=True, workers=4, save_every=10):
    todo = [it for it in items
            if str(it["nid"]) not in cache["reports"]
            or (use_llm and cache["reports"][str(it["nid"])].get("summary", {}).get("by") != "claude")]
    print(f"리포트 {len(items)}건 중 신규/재요약 {len(todo)}건 처리 (Claude {'ON' if use_llm else 'OFF'})")
    done = 0
    with ThreadPoolExecutor(workers) as ex:
        for rec in ex.map(lambda it: enrich(it, cache, use_llm), todo):
            done += 1
            print(f"  [{done}/{len(todo)}] {rec['writeDate']} {rec['brokerName']} {rec['itemName']}"
                  f" — {', '.join(rec['analysts']) or '애널리스트 미확인'}")
            if done % save_every == 0:
                with _lock:
                    save_cache(cache)
    save_cache(cache)
    return [cache["reports"][str(it["nid"])] for it in items]


# ───────────────────────── HTML 생성 ─────────────────────────
def sorted_reports(cache):
    return sorted(cache["reports"].values(), key=lambda r: (r["writeDate"], int(r["nid"])), reverse=True)


def build_html(cache, path=OUTPUT_PATH):
    with open(TEMPLATE_PATH, encoding="utf-8") as f:
        tpl = f.read()
    payload = json.dumps({"updated": cache.get("updated"), "reports": sorted_reports(cache)},
                         ensure_ascii=False).replace("</", "<\\/")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(tpl.replace("/*__DATA__*/null", payload))
    return path


def main():
    ap = argparse.ArgumentParser(description="네이버 증권 종목분석 리포트 수집·요약")
    ap.add_argument("--days", type=int, default=2, help="최근 며칠치 (기본 2)")
    ap.add_argument("--query", help="종목명·종목코드 (종목이 아니면 제목·본문 키워드). 지정 시 날짜 대신 최근 --pages 페이지")
    ap.add_argument("--pages", type=int, default=2)
    ap.add_argument("--no-llm", action="store_true", help="Claude 요약 생략")
    ap.add_argument("--telegram", action="store_true", help="이번에 수집한 리포트 요약을 텔레그램으로 전송")
    args = ap.parse_args()

    cache = load_cache()
    if args.query:
        codes = resolve_stocks(args.query)
        items = list_reports(item_codes=codes, max_pages=args.pages) if codes             else list_reports(query=args.query, max_pages=args.pages)
    else:
        end = dt.date.today()
        start = end - dt.timedelta(days=args.days - 1)
        items = list_reports(start=start.isoformat(), end=end.isoformat(), max_pages=20)
        if not items:   # 주말·휴일이면 가장 최근 1페이지
            items = fetch_list(0, PAGE_SIZE).get("items") or []
    recs = collect(items, cache, use_llm=not args.no_llm)
    path = build_html(cache)
    print(f"\n✓ 대시보드: {path}  (누적 {len(cache['reports'])}건)")

    if args.telegram and recs:
        import telegram_send
        telegram_send.send_reports(recs)


if __name__ == "__main__":
    main()
