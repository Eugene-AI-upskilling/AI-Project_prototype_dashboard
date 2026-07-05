# -*- coding: utf-8 -*-
"""CLI: 기존 가공 데이터 추출 → (검수) → Supabase 적재.

사용법 (yujin-research-center 폴더에서):
  python -m db_loader.run                 # 최신 데이터 추출 + 검수 출력 (적재 안 함)
  python -m db_loader.run --date 2026-05-31 --theme-date 2026-05-31
  python -m db_loader.run --push          # Supabase 적재까지 (.env 필요)
"""
import sys, io, os, json, argparse

try:
    sys.stdout.reconfigure(encoding="utf-8")        # GC 시 stdout 닫힘 방지(기존 TextIOWrapper 재할당 금지)
except Exception:
    pass

from . import (extract_themes, extract_events, extract_market, extract_global,
               extract_constituents, extract_news, push_global_indices)


def assemble(daily_date=None, theme_date=None):
    th = extract_themes.extract(theme_date)
    ev = extract_events.extract(daily_date)
    mk = extract_market.extract(daily_date)
    gq = extract_global.extract()
    tc = extract_constituents.extract()
    nw = extract_news.extract([t["name"] for t in th["themes"]])
    gi = push_global_indices.fetch(daily_date)      # NASDAQ·S&P500 (yfinance)
    return {
        "themes": th["themes"],
        "long_signal": th["long_signal"],
        "short_signal": th["short_signal"],
        "events": ev["events"],
        "global_quotes": gq["global_quotes"],
        "theme_constituents": tc["theme_constituents"],
        "theme_news": nw["theme_news"],
        "market_snapshot": mk["market_snapshot"],
        "global_indices": gi,
        "_sources": {"themes": th["_source"], "events": ev["_source"], "market": mk["_source"]},
    }


def summarize(b):
    print("=" * 64)
    print("소스 파일:")
    for k, v in b["_sources"].items():
        print(f"  {k:7} : {os.path.basename(v) if v else '— 없음'}")
    print("-" * 64)
    print(f"themes        : {len(b['themes'])}건")
    if b["themes"]:
        s = b["themes"][0]
        print(f"   예) {s['name']} | 국면 {s['state']} | 1M {s['ret_1m']}% | 크기 {s['concentration']} | ({s['pos_x']},{s['pos_y']})")
    print(f"events        : {len(b['events'])}건 "
          f"(어닝 {sum(1 for e in b['events'] if e['kind']=='earnings')} / "
          f"액션 {sum(1 for e in b['events'] if e['kind']=='action')})")
    for e in b["events"][:3]:
        print(f"   예) [{e['kind']}] {e['name']} | {e.get('sector')} | {e.get('surprise')} | {e['tone']}")
    print(f"long_signal   : {len(b['long_signal'])}건 / short_signal : {len(b['short_signal'])}건")
    ms = b["market_snapshot"]
    if ms:
        print(f"market        : {ms['snapshot_date']} | KOSPI {ms['kospi_chg']} / KOSDAQ {ms['kosdaq_chg']} | "
              f"외국인 {ms['foreign_net']} 기관 {ms['inst_net']}")
        print(f"   강세 {[s['name'] for s in ms['strong_sectors']]} / 약세 {[s['name'] for s in ms['weak_sectors']]}")
        miss = [k for k in ("kospi", "kosdaq", "usdkrw", "ai_summary") if not ms.get(k)]
        if miss:
            print(f"   ⚠ 미보유(추가 소스 필요): {', '.join(miss)}")
    gi = b.get("global_indices") or []
    print(f"global_indices: {len(gi)}건" + (
        " (" + " / ".join(f"{x['name']} {x['price']:,} {x.get('change_pct')}%" for x in gi) + ")" if gi else ""))
    print("=" * 64)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", help="데일리 날짜 YYYY-MM-DD (이벤트/시황)")
    ap.add_argument("--theme-date", help="주간 테마 날짜 YYYY-MM-DD")
    ap.add_argument("--push", action="store_true", help="Supabase 적재")
    ap.add_argument("--out", help="추출 결과 JSON 저장 경로")
    a = ap.parse_args()

    b = assemble(a.date, a.theme_date)
    summarize(b)

    if a.out:
        with open(a.out, "w", encoding="utf-8") as f:
            json.dump(b, f, ensure_ascii=False, indent=2, default=str)
        print("저장:", a.out)

    if a.push:
        from . import supabase_upsert
        print("\nSupabase 적재 중...")
        res = supabase_upsert.push_all(b)
        print("적재 완료:", res)


if __name__ == "__main__":
    main()
