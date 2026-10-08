# -*- coding: utf-8 -*-
"""시황 AI 요약 — 텔레그램 채널(허재환 유진증권 전략) 최근 글 → 1~2문장 요약.

소스: https://t.me/s/huhjae  (공개 웹 프리뷰, 인증 불필요)
요약: Claude API 키(CLAUDE_API_KEY) 있으면 LLM, 없으면 추출식 폴백.
"""
import os, re, html, datetime as _dt, json, urllib.request

CHANNEL = "huhjae"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"


def fetch_posts(n=6):
    """최근 n개 글 [{date, text}] (오래된→최신 순서 중 최신 n개)."""
    url = f"https://t.me/s/{CHANNEL}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        raw = r.read().decode("utf-8", "ignore")

    # 메시지 본문 div + 직전 time datetime 추출
    posts = []
    for m in re.finditer(
            r'<time[^>]*datetime="([^"]+)"[^>]*>.*?'
            r'tgme_widget_message_text[^>]*>(.*?)</div>',
            raw, re.S):
        when, body = m.group(1), m.group(2)
        text = re.sub(r"<br\s*/?>", "\n", body)
        text = re.sub(r"<[^>]+>", "", text)
        text = html.unescape(text).strip()
        if text:
            posts.append({"date": when[:10], "text": text})
    if not posts:  # fallback: time과 무관하게 본문만
        for m in re.finditer(r'tgme_widget_message_text[^>]*>(.*?)</div>', raw, re.S):
            text = html.unescape(re.sub(r"<[^>]+>", "", re.sub(r"<br\s*/?>", "\n", m.group(1)))).strip()
            if text:
                posts.append({"date": None, "text": text})
    return posts[-n:]


def _summarize_llm(text):
    from . import llm
    return llm.text("너는 증권사 리서치 에디터다. 입력은 전략가의 텔레그램 코멘트다. "
                    "오늘의 국내 증시 시황을 일반 투자자가 이해하기 쉽게 한국어 1~2문장으로 요약하라. "
                    "과장·투자권유·이모지 금지. 핵심 동인(수급/업종/이벤트)만 담아라.",
                    text[:6000])


def _summarize_fallback(posts):
    """LLM 키 없을 때: 최신 글을 1~2문장으로 추출(공백 정리·길이 제한)."""
    if not posts:
        return None
    text = re.sub(r"\s+", " ", posts[-1]["text"]).strip()
    # 첫 2문장 또는 130자
    parts = re.split(r"(?<=[.!?。…])\s", text)
    out = " ".join(parts[:2]).strip()
    return (out[:130] + "…") if len(out) > 132 else out


def build_ai_summary(max_posts=6):
    """시황 ai_summary 1~2문장 (실패 시 None)."""
    try:
        posts = fetch_posts(max_posts)
    except Exception as e:
        print("  [warn] 텔레그램 수집 실패:", e)
        return None
    if not posts:
        return None
    from . import llm
    if llm.available():
        try:
            joined = "\n\n".join(p["text"] for p in posts)
            return _summarize_llm(joined) or _summarize_fallback(posts)
        except Exception as e:
            print("  [warn] LLM 요약 실패, 추출식 폴백:", e)
    return _summarize_fallback(posts)


if __name__ == "__main__":
    import sys, io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    ps = fetch_posts(6)
    print(f"수집 글: {len(ps)}개, 최신 날짜: {ps[-1]['date'] if ps else None}")
    from db_loader import llm
    print("LLM 키:", "있음(Claude)" if llm.available() else "없음(추출식 폴백)")
    print("요약 결과:", build_ai_summary())
