# -*- coding: utf-8 -*-
"""근거형 Q&A — 검색한 리포트 원문만 근거로 가설별 답변 초안을 만든다.

흐름: 질문 → 쪽 단위 검색(retrieval) → Claude 구조화 출력(가설 · 사실 · 당사 견해 · 반대 근거 · 확인할 점,
      각 문장에 원문 인용) → 인용문을 실제 쪽 원문과 대조(verify) → 애널리스트 검수 대기.

Citations 기능은 구조화 출력과 함께 쓸 수 없어(400) 인용문을 JSON으로 받고 서버에서 원문과 대조한다.
"""
import difflib
import re
import sys
import os
import time

from . import db, retrieval

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from db_loader import llm   # noqa: E402  (키 탐색 · 클라이언트 · 모델 · fallback 설정 공유)

PERSONA_LABEL = {"am": "법인 · 자산운용사 운용역", "ia": "법인 · 투자자문사", "dma": "법인 · DMA 전문투자자", "hnw": "WM · 고액자산가(일반투자자)"}

SYSTEM = """너는 유진투자증권 리서치센터의 'AI 리서치 담당자'다. 담당 직원이 없는 기관·HNW 고객의 시장 질문에, 아래 <sources>로 주어진 유진 리서치 리포트 원문만 근거로 답변 초안을 쓴다. 초안은 애널리스트가 검수한 뒤 고객에게 공개된다.

원칙
- 근거는 <sources>의 원문뿐이다. 원문에 없는 수치·사실·전망을 만들지 않는다. 일반 상식으로 빈칸을 메우지 않는다.
- 결론을 단정하지 않는다. 질문이 묻는 원인을 2~3개의 가설(관점)로 나누고, 가설마다 근거 강도를 매긴다.
- 가설마다: 사실(원문이 확인해 주는 사실), 당사 견해(유진 애널리스트의 판단·전망), 반대 근거(그 가설에 불리한 원문 근거, 없으면 빈 값), 확인할 점(앞으로 지켜볼 지표·이벤트).
- 모든 사실·견해·반대 근거에는 cite를 단다. cite.source_id는 <page id="..."> 값 그대로, cite.quote는 그 쪽 원문에서 그대로 복사한 연속 구절(15~80자)이다. 띄어쓰기·기호까지 원문과 같게 쓰고, 요약하거나 고쳐 쓰지 않는다.
- 매수·매도·비중 같은 매매 권유를 하지 않는다. 목표주가·투자의견은 '당사 견해'로 원문 그대로 전할 수만 있다.
- route 판단:
  · answer: 리서치 근거로 답할 수 있는 시장·산업·기업 질문.
  · hold: 리서치 질문이지만 sources에 근거가 부족하다. 추측하지 말고 hold로 두고 hypotheses는 비운다.
  · pb: 일반투자자가 특정 상품·종목의 매매 여부를 묻는 등 적합성 확인이 필요한 요청 → 담당 PB 연결. hypotheses는 비운다.
  · desk: 수수료·계좌·DMA 이용 조건 같은 서비스 문의 → 담당 데스크 연결. hypotheses는 비운다.
- verdict는 고객이 먼저 읽는 2문장 요약이다. 근거 강도 순서를 말하고 단정하지 않는다.
- 한국어, 짧고 평이한 문장. 고객 유형(기관/HNW)에 맞춰 용어 수준만 조절한다."""

_CITE = {"type": "object", "properties": {"source_id": {"type": "string"}, "quote": {"type": "string"}},
         "required": ["source_id", "quote"], "additionalProperties": False}
_STMT = {"type": "object", "properties": {"text": {"type": "string"}, "cite": _CITE},
         "required": ["text", "cite"], "additionalProperties": False}
SCHEMA = {
    "type": "object",
    "properties": {
        "route": {"type": "string", "enum": ["answer", "hold", "pb", "desk"]},
        "route_reason": {"type": "string"},
        "topic": {"type": "string"},
        "verdict": {"type": "string"},
        "hypotheses": {"type": "array", "items": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "strength": {"type": "string", "enum": ["유효", "부분 유효", "약함", "단기 요인"]},
                "facts": {"type": "array", "items": _STMT},
                "view": _STMT,
                "counter": _STMT,
                "checks": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["title", "strength", "facts", "view", "counter", "checks"],
            "additionalProperties": False}},
    },
    "required": ["route", "route_reason", "topic", "verdict", "hypotheses"],
    "additionalProperties": False,
}


def _sources(question, k=14):
    hits = retrieval.search(question, k=k)
    meta = {r["id"]: r for r in db.q("select id,title,category,author,published_at,url from reports where id in (%s)"
                                       % ",".join(str(h["report_id"]) for h in hits))} if hits else {}
    out = []
    for h in hits:
        p = db.q("select text from pages where report_id=? and page=?", (h["report_id"], h["page"]), one=True)
        r = meta[h["report_id"]]
        out.append({"id": f"R{h['report_id']}-p{h['page']}", "report_id": h["report_id"], "page": h["page"],
                    "title": r["title"], "date": r["published_at"], "author": r["author"], "category": r["category"],
                    "url": r["url"], "text": (p or {}).get("text", "")[:6000]})
    return out


def _norm(s):
    return re.sub(r"[\s ·,.'\"“”‘’()\[\]-]", "", s or "")


def verify(cite, by_id):
    """인용문이 해당 쪽 원문에 실제로 있는지: ok(그대로 있음) · partial(대부분 일치) · missing."""
    src = by_id.get((cite or {}).get("source_id"))
    q = _norm((cite or {}).get("quote"))
    if not src or len(q) < 4:
        return {"status": "missing"}
    t = _norm(src["text"])
    if q in t:
        st = "ok"
    else:
        m = difflib.SequenceMatcher(None, t, q, autojunk=False).find_longest_match(0, len(t), 0, len(q))
        st = "partial" if m.size >= 0.7 * len(q) else "missing"
    return {"status": st, "report_id": src["report_id"], "page": src["page"], "title": src["title"],
            "date": src["date"], "url": f"{src['url']}#page={src['page']}"}


def draft(question, persona="am"):
    """질문 → 검증된 답변 초안 dict. 실패 시 예외."""
    t0 = time.time()
    srcs = _sources(question)
    by_id = {s["id"]: s for s in srcs}
    body = "\n".join(f'<page id="{s["id"]}" report="{s["title"]}" date="{s["date"]}" author="{s["author"]}">\n{s["text"]}\n</page>'
                     for s in srcs)
    user = (f"<sources>\n{body}\n</sources>\n\n고객 유형: {PERSONA_LABEL.get(persona, persona)}\n"
            f"질문: {question}")
    resp = llm._get_client().beta.messages.create(
        model=llm.MODEL, max_tokens=16000,
        system=[{"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": user}],
        output_config={"effort": "medium", "format": {"type": "json_schema", "schema": SCHEMA}},
        betas=llm._BETAS, fallbacks="default",
    )
    if resp.stop_reason == "refusal":
        raise RuntimeError("모델이 답변을 거절했습니다")
    if resp.stop_reason == "max_tokens":
        raise RuntimeError("답변이 길어 잘렸습니다")
    import json
    out = json.loads(next(b.text for b in resp.content if b.type == "text"))

    checked = total = 0
    for h in out.get("hypotheses", []):
        for s in h["facts"] + [h["view"], h["counter"]]:
            if s.get("text"):
                s["verify"] = verify(s.get("cite"), by_id)
                total += 1
                checked += s["verify"]["status"] == "ok"
    out["meta"] = {"model": resp.model, "secs": round(time.time() - t0, 1), "cite_ok": checked, "cite_total": total,
                   "sources": [{k: s[k] for k in ("id", "report_id", "page", "title", "date", "url")} for s in srcs],
                   "usage": {"in": resp.usage.input_tokens, "out": resp.usage.output_tokens}}
    return out
