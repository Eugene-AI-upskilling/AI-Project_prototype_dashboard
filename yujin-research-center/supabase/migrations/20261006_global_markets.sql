-- 해외 증시 페이지(global.html): 섹터 히트맵 · 신고가/ATH 스크리너 · AI 딥리서치
-- 적재: python -m db_loader.global_markets --push
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
