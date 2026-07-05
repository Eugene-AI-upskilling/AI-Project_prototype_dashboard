# -*- coding: utf-8 -*-
"""스키마 마이그레이션 러너 — 필요한 컬럼(ALTER)을 Management API로 일괄 적용.

DDL은 service_role 키로 불가하므로 Management API 토큰이 필요합니다.
  .env 에  SUPABASE_ACCESS_TOKEN=sbp_...  추가 (채팅 X, 작업 후 Revoke 권장)
실행:  python -m db_loader.migrate
"""
import os, sys, io, json, urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except ImportError:
    pass

REF = "zvnnpwdfeaakhxklcjfk"

MIGRATIONS = """
alter table public.reports         add column if not exists url   text;
alter table public.reports         add column if not exists kind  text;   -- macro/sector/company
alter table public.market_snapshot add column if not exists flows jsonb;  -- KOSPI/KOSDAQ 수급
notify pgrst, 'reload schema';
"""


def main():
    token = os.environ.get("SUPABASE_ACCESS_TOKEN")
    if not token:
        print("SUPABASE_ACCESS_TOKEN 미설정 — .env 에 추가하세요 "
              "(supabase.com/dashboard/account/tokens 에서 발급, 작업 후 Revoke).")
        sys.exit(1)
    body = json.dumps({"query": MIGRATIONS}).encode("utf-8")
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{REF}/database/query",
        data=body, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=40)
        print("마이그레이션 적용 완료: reports.url, reports.kind, market_snapshot.flows + 스키마 리로드")
    except urllib.error.HTTPError as e:
        print("실패:", e.code, e.read().decode("utf-8", "ignore")[:300])
        sys.exit(1)


if __name__ == "__main__":
    main()
