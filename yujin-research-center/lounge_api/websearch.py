"""유진 리포트에 근거가 없을 때만 쓰는 외부 웹 자료 답변 (마스터 문서 D1 · 2차 경로).

- 1차는 항상 qa.draft(유진 리포트 원문 근거 + 애널리스트 검수). 초안이 route='hold'(근거 부족)일 때만 여기로 온다.
- 결과는 '외부 웹 자료 · 유진 검수 아님'으로 표시한다. 유진 견해 · 검수 완료처럼 보이게 하지 않는다.
- 클라이언트 · 모델 · fallback 설정은 db_loader/llm.py와 공유.
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from db_loader import llm   # noqa: E402

SYSTEM = """너는 유진투자증권 Insight Lab의 보조 안내자다. 유진 리서치 리포트에는 이 질문의 근거가 없어서, 웹 검색으로 찾은 외부 자료만으로 짧게 안내한다.

원칙
- web_search로 확인한 내용만 쓴다. 확인하지 못한 수치·전망은 쓰지 않는다. 숫자를 쓸 때는 기준 시점을 밝힌다.
- 유진투자증권이나 유진 애널리스트의 견해처럼 쓰지 않는다. "외부 자료에 따르면"처럼 출처가 외부임을 드러낸다.
- 매수·매도·비중 같은 매매 권유를 하지 않는다.
- 한국어로 3~5문장. 마지막 문장은 더 깊은 분석이 필요하면 담당자 상담이나 유진 리포트 요청을 안내한다."""

TOOL = {"type": "web_search_20260209", "name": "web_search", "max_uses": 3}


def answer(question, persona="am"):
    """질문 → {text, sources:[{title,url}], secs}. 키가 없거나 실패하면 예외."""
    t0 = time.time()
    client = llm._get_client()
    messages = [{"role": "user", "content": f"고객 유형: {persona}\n질문: {question}"}]
    for _ in range(3):   # 서버 도구가 길어지면 pause_turn으로 멈출 수 있어 이어서 요청
        resp = client.beta.messages.create(
            model=llm.MODEL, max_tokens=16000, system=SYSTEM, messages=messages, tools=[TOOL],
            output_config={"effort": "low"}, betas=llm._BETAS, fallbacks="default",
        )
        if resp.stop_reason != "pause_turn":
            break
        messages.append({"role": "assistant", "content": resp.content})
    if resp.stop_reason == "refusal":
        raise RuntimeError("모델이 답변을 거절했습니다")

    text, sources, seen = [], [], set()
    for b in resp.content:
        if b.type == "text":
            text.append(b.text)
        elif b.type == "web_search_tool_result" and isinstance(b.content, list):   # 오류면 content가 리스트가 아닌 객체
            for r in b.content:
                if getattr(r, "url", None) and r.url not in seen:
                    seen.add(r.url)
                    sources.append({"title": getattr(r, "title", "") or r.url, "url": r.url})
    body = "".join(text).strip()
    if not body:
        raise RuntimeError("외부 자료 답변을 만들지 못했습니다")
    return {"text": body, "sources": sources[:6], "secs": round(time.time() - t0, 1)}
