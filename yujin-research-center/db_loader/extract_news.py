# -*- coding: utf-8 -*-
"""테마 관련 뉴스 + AI 요약 (네이버 뉴스 검색 API).

weekly-theme-report/crawler/crawl_naver_news.py 의 NaverNewsClient 재사용.
테마명으로 최신 뉴스 검색 → 헤드라인/링크/출처 + 테마별 1~2문장 AI 요약.
"""
import os, sys, json, urllib.request
from . import config


def _client():
    cdir = os.path.join(config.WEEKLY_DIR, "crawler")
    if cdir not in sys.path:
        sys.path.insert(0, cdir)
    import crawl_naver_news as cnn   # 자체적으로 src/config(.env NAVER 키) 로드
    return cnn


def _summarize(theme, items):
    """헤드라인 모음 → 1~2문장 한국어 요약(투자권유/이모지 금지). Claude API."""
    from . import llm
    heads = "\n".join(f"- {it.title} ({it.description[:60]})" for it in items[:6])
    return llm.text(f"다음은 '{theme}' 테마 관련 최신 뉴스 헤드라인이다. 이 테마에 무슨 일이 있는지 "
                    "일반 투자자가 이해하기 쉽게 한국어 1~2문장으로 요약하라. 과장·투자권유·이모지 금지.",
                    heads[:3000])


def extract(theme_names, per_theme=6):
    if not theme_names:
        return {"theme_news": []}
    try:
        cnn = _client()
        client = cnn.NaverNewsClient()
    except Exception as e:
        print("  [warn] 뉴스 크롤러 초기화 실패:", e)
        return {"theme_news": []}
    from . import llm
    key = llm.available()

    rows = []
    for name in theme_names:
        try:
            items = client.search_news(query=name, display=per_theme, max_pages=1, sort="date")[:per_theme]
        except Exception as e:
            print(f"  [warn] '{name}' 뉴스 검색 실패:", e)
            items = []
        if not items:
            continue
        summary = None
        if key:
            try:
                summary = _summarize(name, items)
            except Exception as e:
                print(f"  [warn] '{name}' 뉴스 요약 실패:", e)
        for rank, it in enumerate(items, 1):
            rows.append({
                "theme_name": name,
                "title": it.title,
                "url": it.link or it.originallink,
                "source": it.source_domain,
                "pub_date": it.pub_date,
                "summary": summary,
                "rank": rank,
            })
    return {"theme_news": rows}


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    res = extract(["2차전지 셀", "AI 반도체"])
    print(f"theme_news: {len(res['theme_news'])}행")
    seen = set()
    for r in res["theme_news"]:
        if r["theme_name"] not in seen:
            seen.add(r["theme_name"])
            print(f"  [{r['theme_name']}] 요약: {r['summary']}")
