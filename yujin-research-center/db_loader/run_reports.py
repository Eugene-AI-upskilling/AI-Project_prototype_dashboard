# -*- coding: utf-8 -*-
"""발간물 PDF URL 목록 → reports 카드 추출 → (옵션) Supabase 적재.

사용법 (yujin-research-center 폴더에서):
  python -m db_loader.run_reports                     # report_urls.txt 추출 + 검수
  python -m db_loader.run_reports --urls my.txt       # 다른 목록 파일
  python -m db_loader.run_reports --push              # reports 테이블에 적재(교체)
"""
import sys, io, os, argparse

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from . import extract_reports

BASE = os.path.dirname(__file__)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--urls", default=os.path.join(BASE, "report_urls.txt"))
    ap.add_argument("--push", action="store_true")
    a = ap.parse_args()

    with open(a.urls, encoding="utf-8") as f:
        urls = [l.strip() for l in f if l.strip() and not l.startswith("#")]
    print(f"대상 URL: {len(urls)}개\n")

    recs = extract_reports.extract(urls)["reports"]
    for r in recs:
        extra = f" | 의견 {r['rating']} {r['target_price']} ({r['company']})" if r.get("company") else ""
        print(f"[{r['category']}] {r['title']} · {r['analyst']} · {r['published_at']}{extra}")
    print(f"\n추출 완료: {len(recs)}건")

    if a.push:
        from . import supabase_upsert
        n = supabase_upsert.replace_table("reports", recs)
        print(f"Supabase reports 적재 완료: {n}건")


if __name__ == "__main__":
    main()
