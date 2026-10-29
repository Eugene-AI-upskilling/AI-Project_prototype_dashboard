-- 유진 Insight Lab · 새 Supabase 프로젝트용 스키마 (SQL Editor에 통째로 붙여 넣고 Run)
-- 1) 테이블  2) RLS: 시연 데이터는 누구나 읽기, 개인 데이터는 본인만  3) Storage 버킷
create table market_snapshot (snapshot_date date primary key, kospi text, kospi_chg text, kosdaq text, kosdaq_chg text,
  usdkrw text, usdkrw_chg text, foreign_net text, inst_net text, retail_net text,
  strong_sectors jsonb, weak_sectors jsonb,      -- [{name, chg:'+9.02%'}]
  flows jsonb,                                   -- {kospi:{foreign,inst,retail}, kosdaq:{...}} 값 예 '+7,790억'
  ai_summary text, created_at timestamptz default now());
create table ai_briefings (kind text, brief_date date, title text, caption text, script text, video_url text,
  thumbnail_url text, duration int, chapters jsonb, updated_at timestamptz, primary key(kind, brief_date)); -- kind: market | reports
create table global_indices (symbol text primary key, name text, price numeric, change_pct numeric, as_of text, updated_at timestamptz);
create table global_research (id bigserial primary key, kind text, title text, badge text, created_at timestamptz default now(),
  body jsonb);  -- overnight: {asof, note, rows:[{name,chg}]} · callsummary: {points:[...]} (티커가 필요하면 ticker text 컬럼 추가)
create table global_sectors (symbol text primary key, name text, kind text, chg_1d numeric, chg_1w numeric, chg_1m numeric,
  price numeric, asof text, updated_at timestamptz);   -- kind: sector | theme
create table global_highs (ticker text primary key, name text, sector text, close numeric, chg_pct numeric, vol_ratio numeric,
  is_20d bool, is_ath bool, from_52w_high numeric, ath_streak int, ma20_gap numeric, next_earnings date, spark jsonb, asof text, updated_at timestamptz);
create table global_quotes (ticker text primary key, name text, sector text, next_earnings_date date, last_earnings_date date,
  eps numeric, eps_estimate numeric, eps_surprise numeric, updated_at timestamptz);
create table global_deep_research (ticker text primary key, asof text, thesis text, drivers jsonb, risks jsonb, checkpoints jsonb,
  metrics jsonb, sources jsonb, model text, updated_at timestamptz);
create table themes (id bigserial primary key, name text, concentration numeric, ret_1m numeric, state text,
  pos_x numeric, pos_y numeric, week_of date, created_at timestamptz default now());
create table theme_constituents (id bigserial primary key, theme_name text, stock_name text, stock_code text, ret_1d numeric, ret_1w numeric, week_of date, created_at timestamptz default now());
create table theme_news (id bigserial primary key, theme_name text, title text, url text, source text, pub_date text, summary text, rank int, created_at timestamptz default now());
create table theme_signals (id bigserial primary key, side text, rank int, name text, themes text, n_themes int, balance_change text, ret_1w numeric, week_of date, created_at timestamptz default now());
create table reports (id bigserial primary key, kind text, category text, risk text, tone text, title text, summary text,
  company text, rating text, target_price text, analyst text, published_at date, url text, created_at timestamptz default now()); -- kind: macro|sector|company
create table card_news (id bigserial primary key, report_id bigint, report_url text, title text, category text, analyst text, team text,
  published_at date, deck jsonb, created_at timestamptz default now(), updated_at timestamptz);
create table events (id bigserial primary key, kind text, ticker text, name text, sector text, detail text, consensus text, actual text,
  surprise text, price_move text, ref_date text, tone text, signal text, created_at timestamptz default now()); -- kind: action|earnings, tone: up|down, signal: High|Medium|Low
create table stocks (code text primary key, name text, sector text, market text, market_cap_bil numeric, fiscal_month text, shares numeric,
  kospi200 bool, kosdaq150 bool, krx300 bool, ret_1w numeric, ret_1m numeric, ret_3m numeric, ret_12m numeric, ret_ytd numeric, fwd_pe numeric, fwd_pb numeric);
create table insights (id bigserial primary key, tab text, tag text, title text, author text, role text, summary text, grad text, channel_url text, created_at timestamptz default now());
create table quant_theme_constituents (theme_name text, code text, stock_name text, source_count int, rank int, mcap_bil numeric, updated_at timestamptz);
create table quant_stock_stats (code text primary key, name text, cagr numeric, vol numeric, div numeric, mcap_bil numeric, months int, mdd numeric,
  idio_cagr numeric, idio_vol numeric, idio_share numeric, beta_mkt numeric, r2 numeric, idio_months int, updated_at timestamptz);
create table quant_factor_returns (factor_id text, month date, ret numeric, primary key(factor_id, month));
create table quant_factor_meta (factor_id text primary key, name_ko text, description text, rule text, updated_at timestamptz);
create table quant_tearsheets (key text primary key, title text, factors jsonb, period_years int, url text, cagr numeric, sharpe numeric, mdd numeric, generated_at timestamptz);
create table saved_strategies (id bigserial primary key, user_id uuid references auth.users, kind text, title text, config jsonb, metrics jsonb, created_at timestamptz default now());
create table subscriptions (user_id uuid references auth.users, channel text, channel_url text, created_at timestamptz default now(), primary key(user_id, channel));
create table lounge_members (user_id uuid primary key references auth.users, name text, role text, seg text, cust_type text, persona text,
  org text, branch text, invite_code text, status text default 'pending', created_at timestamptz default now());

-- quant_theme_constituents는 원본에 기본키가 없어 가져오기 때 중복 방지용으로 둔다
alter table quant_theme_constituents add primary key (theme_name, code);

alter table market_snapshot enable row level security; create policy "public read" on market_snapshot for select using (true);
alter table ai_briefings enable row level security; create policy "public read" on ai_briefings for select using (true);
alter table global_indices enable row level security; create policy "public read" on global_indices for select using (true);
alter table global_research enable row level security; create policy "public read" on global_research for select using (true);
alter table global_sectors enable row level security; create policy "public read" on global_sectors for select using (true);
alter table global_highs enable row level security; create policy "public read" on global_highs for select using (true);
alter table global_quotes enable row level security; create policy "public read" on global_quotes for select using (true);
alter table global_deep_research enable row level security; create policy "public read" on global_deep_research for select using (true);
alter table themes enable row level security; create policy "public read" on themes for select using (true);
alter table theme_constituents enable row level security; create policy "public read" on theme_constituents for select using (true);
alter table theme_news enable row level security; create policy "public read" on theme_news for select using (true);
alter table theme_signals enable row level security; create policy "public read" on theme_signals for select using (true);
alter table reports enable row level security; create policy "public read" on reports for select using (true);
alter table card_news enable row level security; create policy "public read" on card_news for select using (true);
alter table events enable row level security; create policy "public read" on events for select using (true);
alter table stocks enable row level security; create policy "public read" on stocks for select using (true);
alter table insights enable row level security; create policy "public read" on insights for select using (true);
alter table quant_theme_constituents enable row level security; create policy "public read" on quant_theme_constituents for select using (true);
alter table quant_stock_stats enable row level security; create policy "public read" on quant_stock_stats for select using (true);
alter table quant_factor_returns enable row level security; create policy "public read" on quant_factor_returns for select using (true);
alter table quant_factor_meta enable row level security; create policy "public read" on quant_factor_meta for select using (true);
alter table quant_tearsheets enable row level security; create policy "public read" on quant_tearsheets for select using (true);
alter table saved_strategies enable row level security; create policy "own rows" on saved_strategies for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table subscriptions enable row level security; create policy "own rows" on subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table lounge_members enable row level security; create policy "own rows" on lounge_members for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage: 앵커 영상 · 썸네일(briefings), 퀀트 성과 리포트(tearsheets) — 공개 읽기
insert into storage.buckets (id, name, public) values ('briefings','briefings',true), ('tearsheets','tearsheets',true) on conflict (id) do nothing;
create policy "public read briefings" on storage.objects for select using (bucket_id in ('briefings','tearsheets'));
