# -*- coding: utf-8 -*-
"""신규 리포트 → 카드뉴스 자동 생성.

흐름: reports 중 card_news 없는 최근 리포트 → PDF 다운로드(앞 MAX_PAGES쪽)
      → Claude가 PDF를 읽고 SCHEMA.md 형식 JSON 작성 → 검증(실패 시 1회 수정 요청)
      → cardnews/<파일명>.json 저장 → (선택) PNG → Supabase card_news upsert.

  python -m db_loader.make_cardnews                 # 최근 3일, 최대 CARDNEWS_MAX건
  python -m db_loader.make_cardnews --days 7 --max 2 --png
  python -m db_loader.make_cardnews --url <PDF URL> --no-push   # 한 건만 시험

필요: 환경변수 CLAUDE_API_KEY 또는 ANTHROPIC_API_KEY (없으면 안내만 하고 exit 0 — 스케줄러 실패로 안 보이게).
숫자는 리포트 본문 텍스트 기준(차트 라벨 불신) — SYSTEM 프롬프트에 명시.
"""
import argparse, datetime as dt, json, os, re, sys

import requests

from . import supabase_upsert as su          # import 시 .env 로드 (SUPABASE_*, ANTHROPIC_API_KEY)
from . import extract_reports as er
from . import cardnews_push as cp

BASE = os.path.dirname(os.path.abspath(__file__))
DECK_DIR = os.path.join(BASE, "cardnews")
MODEL = os.environ.get("CARDNEWS_MODEL", "claude-opus-5-5")
MAX_PAGES = 30                               # 장문 산업 리포트(80쪽+)는 앞부분(요약·본론)만
DEFAULT_MAX = int(os.environ.get("CARDNEWS_MAX", "12"))

BLOCK_TYPES = {"change", "stats", "hero", "bars", "flows", "updown", "gauge", "list", "takeaway", "kv", "note"}
HANGUL = re.compile(r"[가-힣]")


def _api_key():
    """ANTHROPIC_API_KEY → CLAUDE_API_KEY(setx 등록) 순. setx 값은 이미 떠 있던 프로세스엔 안 보이므로
    Windows 사용자 환경변수(HKCU\\Environment)에서도 찾는다."""
    for name in ("ANTHROPIC_API_KEY", "CLAUDE_API_KEY"):
        if os.environ.get(name):
            return os.environ[name]
    if os.name == "nt":
        import winreg
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as k:
                for name in ("ANTHROPIC_API_KEY", "CLAUDE_API_KEY"):
                    try:
                        return winreg.QueryValueEx(k, name)[0]
                    except FileNotFoundError:
                        pass
        except OSError:
            pass
    return None


def _system_prompt():
    schema = open(os.path.join(DECK_DIR, "SCHEMA.md"), encoding="utf-8").read()
    example = open(os.path.join(DECK_DIR, "20261002_B_lee.jy_47.json"), encoding="utf-8").read()
    return (
        "너는 유진투자증권 리서치센터의 카드뉴스 에디터다. 첨부된 리포트 PDF를 읽고, "
        "일반 투자자가 1~2분에 핵심을 파악할 수 있는 카드뉴스를 아래 JSON 스키마로 작성한다.\n\n"
        "## 반드시 지킬 것\n"
        "- 모든 숫자는 리포트 **본문 문장**에 나온 값만 쓴다. 차트의 축 값·데이터 라벨은 틀릴 수 있으니 쓰지 않는다. "
        "본문과 표·차트가 다르면 본문을 따른다. 본문 문장으로 확인되지 않는 숫자는 빼라.\n"
        "- 리포트에 없는 전망·해석·투자 권유를 만들지 않는다. 결론과 투자의견·목표주가는 리포트에 적힌 그대로만 쓴다(기업 리포트에 명시된 경우만).\n"
        "- 추천 종목 표·포트폴리오 편입 종목은 카드로 옮기지 않는다.\n"
        "- 6~9장. 첫 장은 cover, 마지막 장은 \"disc\": true. 한 장에 블록 2~4개, 제목은 줄당 14자 안팎(\\n 줄바꿈), 설명은 해요체.\n"
        "- title(최상위)은 리포트의 실제 헤드라인(표지 이미지에만 있을 수도 있음)을 짧게. 주간/일간 시리즈처럼 헤드라인이 없으면 핵심 요약으로 만든다.\n"
        "- 출력은 JSON 객체 하나만. 코드펜스·설명 문장 없이.\n\n"
        "## 스키마\n" + schema + "\n\n## 승인된 예시 (톤·밀도·구성 참고)\n" + example
    )


def validate(deck):
    """렌더러가 깨지지 않는지 + 편집 규칙 점검. 문제 목록 반환(빈 리스트=통과)."""
    errs = []
    for k in ("title", "slides"):
        if not deck.get(k):
            errs.append(f"최상위 '{k}' 없음")
    slides = deck.get("slides") or []
    if not 5 <= len(slides) <= 10:
        errs.append(f"슬라이드 {len(slides)}장 (6~9장 필요)")
    if slides and slides[0].get("type") != "cover":
        errs.append("첫 장이 cover가 아님")
    for i, s in enumerate(slides[1:], 2):
        if s.get("type") != "content":
            errs.append(f"{i}장: type은 content여야 함")
        if not s.get("title"):
            errs.append(f"{i}장: title 없음")
        blocks = s.get("blocks") or []
        if not 1 <= len(blocks) <= 5:
            errs.append(f"{i}장: 블록 {len(blocks)}개 (1~5개)")
        for j, b in enumerate(blocks, 1):
            t = b.get("t")
            if t not in BLOCK_TYPES:
                errs.append(f"{i}장 블록{j}: 알 수 없는 t='{t}'")
            elif t in ("stats", "bars", "flows", "list") and not b.get("items"):
                errs.append(f"{i}장 블록{j}({t}): items 없음")
            elif t == "updown" and not (b.get("up") or b.get("down")):
                errs.append(f"{i}장 블록{j}(updown): up/down 없음")
            elif t == "change" and not (b.get("from") and b.get("to")):
                errs.append(f"{i}장 블록{j}(change): from/to 없음")
            elif t in ("takeaway", "note") and not b.get("text"):
                errs.append(f"{i}장 블록{j}({t}): text 없음")
    return errs


def _parse_json(text):
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
    a, b = text.find("{"), text.rfind("}")
    if a < 0 or b < a:
        raise ValueError("JSON 객체를 찾지 못함")
    return json.loads(text[a:b + 1])


def _pdf_bytes(fp):
    import fitz
    doc = fitz.open(fp)
    if doc.page_count <= MAX_PAGES:
        return open(fp, "rb").read(), doc.page_count
    part = fitz.open()
    part.insert_pdf(doc, from_page=0, to_page=MAX_PAGES - 1)
    return part.tobytes(), doc.page_count


def _ask(client, system, messages):
    """Opus 5.5 + adaptive thinking(기본) · effort high · 서버측 거절 폴백. 최종 메시지 반환."""
    with client.beta.messages.stream(
        model=MODEL,
        max_tokens=32000,
        system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
        output_config={"effort": "high"},
        betas=["server-side-fallback-2026-07-01"],
        extra_body={"fallbacks": "default"},
        messages=messages,
    ) as stream:
        return stream.get_final_message()


def _text(msg):
    return "".join(b.text for b in msg.content if b.type == "text")


def generate(client, system, rep):
    """reports 행 1건 → 검증된 덱(dict) 또는 None."""
    import base64
    fp = er.download_pdf(rep["url"])
    data, n_pages = _pdf_bytes(fp)
    info = er.parse_url(rep["url"])
    hint = {
        "report_url": rep["url"], "published_at": rep.get("published_at") or info["date"],
        "kind": rep.get("kind") or info["kind"], "category_hint": rep.get("category"),
        "analyst_hint": rep.get("analyst"), "pages_attached": min(n_pages, MAX_PAGES), "pages_total": n_pages,
    }
    messages = [{"role": "user", "content": [
        {"type": "document", "source": {"type": "base64", "media_type": "application/pdf",
                                        "data": base64.standard_b64encode(data).decode()}},
        {"type": "text", "text": "이 리포트로 카드뉴스 JSON을 작성해 줘. 메타 힌트(analyst_hint가 영문 ID면 PDF의 한글 이름을 써):\n"
                                 + json.dumps(hint, ensure_ascii=False)},
    ]}]
    for attempt in (1, 2):
        msg = _ask(client, system, messages)
        if msg.stop_reason == "refusal":
            print("  [skip] 모델이 거절:", getattr(msg.stop_details, "category", None))
            return None
        if msg.stop_reason == "max_tokens":
            print("  [warn] 출력이 max_tokens에서 잘림")
        try:
            deck = _parse_json(_text(msg))
            errs = validate(deck)
        except ValueError as e:                # json.JSONDecodeError 포함
            deck, errs = None, [f"JSON 파싱 실패: {e}"]
        if not errs:
            break
        print(f"  [retry {attempt}] 검증 실패:", "; ".join(errs[:6]))
        if attempt == 2:
            return None
        messages += [{"role": "assistant", "content": msg.content},
                     {"role": "user", "content": "다음 문제를 고쳐서 전체 JSON을 다시 출력해 줘(JSON만):\n- " + "\n- ".join(errs)}]

    # DB 기준값으로 고정 (링크·날짜는 모델이 바꾸지 못하게)
    deck["report_url"] = rep["url"]
    deck["published_at"] = hint["published_at"]
    if rep.get("analyst") and HANGUL.search(rep["analyst"]):
        deck["analyst"] = rep["analyst"]
    deck["slides"][-1]["disc"] = True
    return deck


def pending(days, limit):
    since = (dt.date.today() - dt.timedelta(days=days)).isoformat()
    res = requests.get(f"{su.URL}/rest/v1/reports", headers=su._headers(), timeout=30, params={
        "select": "id,url,kind,category,analyst,published_at", "published_at": f"gte.{since}",
        "order": "published_at.desc,id.desc"})
    res.raise_for_status()
    done = set(su.fetch_column("card_news", "report_url"))
    return [r for r in res.json() if r.get("url") and r["url"] not in done][:limit]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=3)
    ap.add_argument("--max", type=int, default=DEFAULT_MAX)
    ap.add_argument("--url", help="이 PDF 한 건만 생성(reports에 없어도 됨)")
    ap.add_argument("--png", action="store_true", help="SNS용 PNG도 output/cardnews/ 에 저장")
    ap.add_argument("--no-push", action="store_true")
    a = ap.parse_args()

    key = _api_key()
    if not (key or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
        print("[skip] Claude API 키 미설정 — 환경변수 CLAUDE_API_KEY(또는 ANTHROPIC_API_KEY)를 등록하면 카드뉴스가 자동 생성됩니다.")
        return 0
    import anthropic
    client = anthropic.Anthropic(api_key=key) if key else anthropic.Anthropic()
    system = _system_prompt()

    reps = [{"url": a.url}] if a.url else pending(a.days, a.max)
    print(f"카드뉴스 생성 대상: {len(reps)}건 (model={MODEL})")
    made, failed = [], 0
    for rep in reps:
        name = rep["url"].rsplit("/", 1)[-1].replace(".pdf", "")
        print(f"- {name}")
        try:
            deck = generate(client, system, rep)
        except (anthropic.APIError, ValueError, OSError) as e:   # API 오류·PDF 404 등은 건너뛰고 다음 리포트
            print("  [error]", type(e).__name__, e)
            deck = None
        if not deck:
            failed += 1
            continue
        path = os.path.join(DECK_DIR, name + ".json")
        json.dump(deck, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"  ✓ {deck['title']} ({len(deck['slides'])}장)")
        if a.png:
            try:
                cp.export_png(path)
            except Exception as e:             # PNG는 부가 기능 — 실패해도 적재는 진행
                print("  [warn] PNG 실패:", e)
        made.append(deck)
    if made and not a.no_push:
        cp.push(made)
    print(f"완료: 생성 {len(made)} / 실패 {failed}")
    return 1 if failed and not made else 0


if __name__ == "__main__":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.exit(main())
