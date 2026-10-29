# -*- coding: utf-8 -*-
"""시연용 데이터 수집 → 새 Supabase 적재 (한 번에 실행).

  python run.py --dry-run                 # 적재 없이 수집만 → out/*.json 으로 확인 (Supabase 키 불필요)
  python run.py                           # 최근 7일 수집 + 적재 (카드뉴스 6건 포함, claude_api_key 있을 때)
  python run.py --days 14 --cardnews 9    # 기간 · 카드뉴스 개수 바꾸기
  python run.py --only reports,market     # 일부만 (reports market themes global events cardnews)
"""
import argparse
import time

import reports
import market
import themes
import global_market
import events
from common import save_preview

STEPS = ["reports", "market", "themes", "global", "events", "cardnews"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=7)
    ap.add_argument("--cardnews", type=int, default=6, help="새로 만들 카드뉴스 최대 개수 (0이면 생략)")
    ap.add_argument("--only", default=",".join(STEPS))
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    only = [s.strip() for s in a.only.split(",") if s.strip()]
    sb = None
    if not a.dry_run:
        from common import Supabase
        sb = Supabase()

    def step(name, fn_crawl, fn_push, preview):
        if name not in only:
            return
        t0 = time.time()
        print(f"\n▶ {name}")
        try:
            data = fn_crawl()
        except Exception as e:
            print(f"  ✗ 수집 실패: {e}")
            return
        if data is None:
            return
        if a.dry_run:
            for k, v in preview(data).items():
                save_preview(k, v)
            print(f"  → out/ 저장 ({time.time() - t0:.0f}s)")
        else:
            n = fn_push(sb, data)
            print(f"  → Supabase {n}행 적재 ({time.time() - t0:.0f}s)")

    step("reports", lambda: reports.crawl(a.days), reports.push, lambda d: {"reports": d})
    step("market", lambda: market.crawl(a.days), market.push, lambda d: {"market_snapshot": d})
    step("themes", themes.crawl, themes.push, lambda d: {"themes": d[0], "theme_constituents": d[1]})
    step("global", global_market.crawl, global_market.push,
         lambda d: {"global_indices": d[0], "global_sectors": d[1], "global_research": d[2], "global_quotes": d[3]})
    step("events", lambda: events.crawl(a.days), events.push, lambda d: {"events": d})
    if "cardnews" in only and a.cardnews > 0:
        print("\n▶ cardnews")
        if a.dry_run:
            print("  (dry-run에서는 생략 — 적재된 reports를 읽어 만들기 때문)")
        else:
            import cardnews
            print(f"  → 카드뉴스 {cardnews.run(sb, a.days, a.cardnews)}건 적재")
    print("\n완료.")


if __name__ == "__main__":
    main()
