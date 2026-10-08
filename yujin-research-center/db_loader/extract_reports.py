# -*- coding: utf-8 -*-
"""발간물 PDF URL → reports 카드 레코드.

흐름: URL 파싱(유형/작성자/날짜) → PDF 다운로드(캐시) → 텍스트 추출(fitz)
      → LLM 구조화 요약 → reports 스키마 레코드(+공개 PDF url).

유형 토큰:  B=매크로 · B####=섹터(####=섹터코드) · ######(6자리)=종목코드
"""
import os, re, json, urllib.request

BASE = os.path.dirname(__file__)
CACHE = os.path.join(BASE, "_cache")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"

_AUTHORS = json.load(open(os.path.join(BASE, "maps", "authors.json"), encoding="utf-8"))
_SECTORS = json.load(open(os.path.join(BASE, "maps", "sectors.json"), encoding="utf-8"))


def parse_url(url):
    """.../amail/{date}_{type}_{author}_{seq}.pdf → 메타 dict."""
    fn = url.rsplit("/", 1)[-1].replace(".pdf", "")
    parts = fn.split("_")
    date, type_tok, author_id, seq = parts[0], parts[1], "_".join(parts[2:-1]), parts[-1]
    info = {"url": url, "date": f"{date[:4]}-{date[4:6]}-{date[6:8]}",
            "type_token": type_tok, "author_id": author_id, "seq": seq,
            "kind": "etc", "sector_code": None, "ticker": None}
    if type_tok == "B":
        info["kind"] = "macro"
    elif re.match(r"^B\d+$", type_tok):
        info["kind"] = "sector"; info["sector_code"] = type_tok[1:]
    elif re.match(r"^\d{6}$", type_tok):
        info["kind"] = "company"; info["ticker"] = type_tok
    return info


def download_pdf(url):
    os.makedirs(CACHE, exist_ok=True)
    fp = os.path.join(CACHE, url.rsplit("/", 1)[-1])
    if os.path.exists(fp) and os.path.getsize(fp) > 1000:
        return fp
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=40) as r:
        data = r.read()
    if not data[:5].startswith(b"%PDF"):       # 404/만료 → HTML 등
        raise ValueError("유효한 PDF 아님(404/만료 추정)")
    with open(fp, "wb") as f:
        f.write(data)
    return fp


def pdf_text(fp, max_pages=4):
    import fitz
    doc = fitz.open(fp)
    return "".join(doc[i].get_text() for i in range(min(max_pages, doc.page_count)))


REPORT_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "summary": {"type": "string"},
        "category": {"type": "string"},
        "analyst": {"type": "string"},
        "company": {"type": ["string", "null"]},
        "rating": {"type": ["string", "null"]},
        "target_price": {"type": ["string", "null"]},
    },
    "required": ["title", "summary", "category", "analyst", "company", "rating", "target_price"],
    "additionalProperties": False,
}


def summarize(text, kind):
    """리포트 본문 → 카드뉴스용 메타데이터 (Claude API, JSON Schema 로 형식 보장)."""
    from . import llm
    sys_msg = ("너는 증권사 리서치 에디터다. 아래 리포트 본문을 읽고 카드뉴스용 메타데이터를 작성하라. "
               "추정/창작 금지, 본문 근거만. title=리포트 제목(한글), summary=일반 투자자용 2문장 요약"
               "(과장/투자권유/이모지 금지), category=짧은 분류(예: 반도체/2차전지/투자전략), "
               "analyst=작성 애널리스트 한글명, company=종목명(없으면 null), rating=투자의견(매수/중립/매도, 없으면 null), "
               "target_price=목표주가(예: 95,000원) 또는 상승여력(없으면 null).")
    return llm.json_out(sys_msg, f"[유형:{kind}]\n{text[:6500]}", REPORT_SCHEMA, effort="low") or {}


def to_record(url):
    """단일 URL → reports 레코드(dict). 실패 시 None."""
    info = parse_url(url)
    from . import llm
    key = llm.available()
    try:
        text = pdf_text(download_pdf(url))
    except Exception as e:
        print("  [warn]", url.rsplit('/', 1)[-1], "PDF 열기 실패 → 스킵:", e)
        return None
    meta = {}
    if key:
        try:
            meta = summarize(text, info["kind"])
        except Exception as e:
            print("  [warn]", url.rsplit('/', 1)[-1], "요약 실패:", e)

    # 작성자/카테고리 표준화(매핑 우선, 없으면 PDF 추출값)
    amap = _AUTHORS.get(info["author_id"], {})
    analyst = (amap.get("name") or meta.get("analyst") or info["author_id"])
    if info["kind"] == "macro":
        category = "투자전략"
    elif info["kind"] == "sector":
        category = _SECTORS.get(info["sector_code"]) or meta.get("category") or "산업분석"
    elif info["kind"] == "company":
        category = meta.get("category") or "기업분석"   # 칩=산업분류, 종목명은 company에
    else:
        category = meta.get("category") or "리포트"

    rating = meta.get("rating")
    return {
        "kind": info["kind"],                 # macro / sector / company → 프론트 3분류 필터
        "category": category,
        "risk": amap.get("desk") or None,
        "tone": "up" if (rating in ("매수", "Buy", "BUY") or not rating) else "down",
        "title": meta.get("title") or f"[{category}] 리포트",
        "summary": meta.get("summary"),
        "company": meta.get("company"),
        "rating": rating,
        "target_price": meta.get("target_price"),
        "analyst": analyst,
        "url": url,
        "published_at": info["date"],
    }


def extract(urls):
    out = []
    for u in urls:
        u = u.strip()
        if not u:
            continue
        rec = to_record(u)
        if rec:
            out.append(rec)
    return {"reports": out}


if __name__ == "__main__":
    import sys, io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    urls = sys.argv[1:] or [l for l in open(os.path.join(BASE, "report_urls.txt"), encoding="utf-8")]
    res = extract(urls)
    for r in res["reports"]:
        print(f"[{r['category']}] {r['title']}  · {r['analyst']} · {r['published_at']}")
        print(f"   {r['summary']}")
        if r["rating"] or r["target_price"]:
            print(f"   의견 {r['rating']} / {r['target_price']} ({r['company']})")
        print()
