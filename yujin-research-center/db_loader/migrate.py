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
-- 해외 증시 페이지(global.html): 섹터 히트맵 · 신고가/ATH 스크리너 · AI 딥리서치
create table if not exists public.global_sectors (
  symbol text primary key, name text not null, kind text not null,   -- kind: 'sector' | 'theme'
  chg_1d numeric, chg_1w numeric, chg_1m numeric, price numeric, asof date,
  updated_at timestamptz default now());
create table if not exists public.global_highs (
  ticker text primary key, name text, sector text, close numeric, chg_pct numeric,
  vol_ratio numeric, is_20d boolean default false, is_ath boolean default false,
  from_52w_high numeric, ath_streak int, ma20_gap numeric, next_earnings text,
  spark jsonb, asof date, updated_at timestamptz default now());
create table if not exists public.global_deep_research (
  ticker text primary key, asof date, thesis text, drivers jsonb, risks jsonb,
  checkpoints jsonb, metrics jsonb, sources jsonb, model text,
  updated_at timestamptz default now());
do $$ declare t text; begin
  foreach t in array array['global_sectors','global_highs','global_deep_research'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "public read %1$s" on public.%1$s;', t);
    execute format('create policy "public read %1$s" on public.%1$s for select using (true);', t);
  end loop; end $$;
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
