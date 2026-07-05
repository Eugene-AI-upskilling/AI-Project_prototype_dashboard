-- ════════════════════════════════════════════════════════════════
-- 유진 Insight Lab · Supabase schema + RLS + seed
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 RUN 하세요.
-- (여러 번 실행해도 안전하도록 idempotent 하게 작성)
-- ════════════════════════════════════════════════════════════════

-- ─────────── 콘텐츠 테이블 (파이프라인이 쓰고, 누구나 읽기) ───────────
create table if not exists public.reports (
  id           bigint generated always as identity primary key,
  category     text not null,
  risk         text,
  tone         text default 'up',          -- up(red) / down(blue)
  title        text not null,
  summary      text,
  company      text,
  rating       text,
  target_price text,
  analyst      text,
  url          text,                       -- 발간물 공개 PDF 링크 (카드 클릭 시 열림)
  published_at date default now(),
  created_at   timestamptz default now()
);
-- 기존 테이블에도 url 컬럼 보장(재실행 안전)
alter table public.reports add column if not exists url text;

create table if not exists public.events (
  id          bigint generated always as identity primary key,
  kind        text not null,               -- 'earnings' | 'action'
  ticker      text,
  name        text not null,
  sector      text,
  detail      text,
  consensus   text,
  actual      text,
  surprise    text,
  price_move  text,
  ref_date    text,
  tone        text default 'up',
  signal      text,
  created_at  timestamptz default now()
);

create table if not exists public.themes (
  id            bigint generated always as identity primary key,
  name          text not null,
  concentration numeric,                   -- 자금 집중도(%)
  ret_1m        numeric,                    -- 1개월 수익률(%)
  state         text,                       -- Leadership / Acceleration / Emerging / Cooling / Reversal
  pos_x         numeric,
  pos_y         numeric,
  week_of       date default now(),
  created_at    timestamptz default now()
);

create table if not exists public.market_snapshot (
  snapshot_date date primary key,
  kospi         text,
  kospi_chg     text,
  kosdaq        text,
  kosdaq_chg    text,
  usdkrw        text,
  usdkrw_chg    text,
  foreign_net   text,
  inst_net      text,
  retail_net    text,
  flows         jsonb,                       -- {kospi:{foreign,inst,retail}, kosdaq:{...}}
  strong_sectors jsonb,                     -- [{name, chg}]
  weak_sectors   jsonb,
  ai_summary    text,
  created_at    timestamptz default now()
);
-- 기존 테이블에도 flows 컬럼 보장(재실행 안전)
alter table public.market_snapshot add column if not exists flows jsonb;

create table if not exists public.theme_signals (
  id          bigint generated always as identity primary key,
  side        text not null,                -- 'long' | 'short'
  rank        int,
  name        text not null,
  themes      text,
  n_themes    int,
  balance_change text,
  ret_1w      text,
  week_of     date default now(),
  created_at  timestamptz default now()
);

create table if not exists public.global_research (
  id         bigint generated always as identity primary key,
  kind       text not null,                 -- 'overnight' | 'earnings' | 'callsummary'
  title      text not null,
  body       jsonb,
  badge      text,
  created_at timestamptz default now()
);

create table if not exists public.insights (
  id          bigint generated always as identity primary key,
  tab         text not null,                -- 'analyst' | 'market' | 'stock'
  tag         text,
  title       text not null,
  author      text,
  role        text,
  summary     text,
  grad        text,                         -- 카드 썸네일 그라데이션
  channel_url text,
  created_at  timestamptz default now()
);

-- ─────────── 사용자 테이블 (본인 것만 접근, RLS) ───────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  name       text,
  created_at timestamptz default now()
);

create table if not exists public.saved_strategies (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users on delete cascade,
  kind       text not null,                 -- 'index' | 'backtest'
  title      text,
  config     jsonb not null,                -- 테마/비중/팩터 등
  created_at timestamptz default now()
);

create table if not exists public.subscriptions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users on delete cascade,
  channel    text not null,                 -- 구독 채널/태그
  channel_url text,
  created_at timestamptz default now(),
  unique (user_id, channel)
);

-- ═══════════════ RLS (Row Level Security) ═══════════════
alter table public.reports          enable row level security;
alter table public.events           enable row level security;
alter table public.themes           enable row level security;
alter table public.market_snapshot  enable row level security;
alter table public.global_research  enable row level security;
alter table public.insights         enable row level security;
alter table public.theme_signals    enable row level security;
alter table public.profiles         enable row level security;
alter table public.saved_strategies enable row level security;
alter table public.subscriptions    enable row level security;

-- 콘텐츠: 누구나 읽기 (쓰기는 service_role 이 RLS 우회하므로 정책 불필요)
do $$
declare t text;
begin
  foreach t in array array['reports','events','themes','market_snapshot','global_research','insights','theme_signals']
  loop
    execute format('drop policy if exists "public read %1$s" on public.%1$s;', t);
    execute format('create policy "public read %1$s" on public.%1$s for select using (true);', t);
  end loop;
end $$;

-- profiles: 본인 행만
drop policy if exists "own profile read"   on public.profiles;
drop policy if exists "own profile insert" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- saved_strategies: 본인 행만
drop policy if exists "own strategies all" on public.saved_strategies;
create policy "own strategies all" on public.saved_strategies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- subscriptions: 본인 행만
drop policy if exists "own subs all" on public.subscriptions;
create policy "own subs all" on public.subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 가입 시 profiles 자동 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ═══════════════ SEED (현재 화면 콘텐츠) ═══════════════
truncate public.reports, public.events, public.themes, public.global_research, public.insights restart identity;

insert into public.reports (category,risk,tone,title,summary,company,rating,target_price,analyst,published_at) values
('반도체','적극투자','up','HBM 슈퍼사이클, 아직 2회말입니다','엔비디아 차세대 GPU 채택 가속 + HBM4 양산 전환. 국내 메모리 3社 수혜 폭 점검.','SK하이닉스','매수','+22%','김도현','2026-06-13'),
('2차전지','중립','up','전기차 캐즘 끝? 하반기 수요 회복 신호','유럽 보조금 재개와 미국 IRA 수혜로 셀·소재 재고 정상화. 저점 분할매수 구간.','에코프로비엠','매수','+18%','이서연','2026-06-12'),
('배당','안정','down','금리 인하기, 고배당주로 갈아탈 시간','밸류업 공시 기업 중 배당성향 상향 + 자사주 소각 병행 종목 선별. 변동성 방어.','KB금융','매수','+11%','박준영','2026-06-11'),
('AI인프라','적극투자','up','데이터센터 전력난, 다음 수혜는 전력기기','AI 학습 전력 수요 폭증 → 변압기·전선 슈퍼사이클. 미국 수출 비중 높은 기업 주목.','HD현대일렉트릭','매수','+27%','정민수','2026-06-10'),
('바이오','적극투자','up','비만치료제 밸류체인, CDMO가 핵심','GLP-1 수요 폭발로 위탁생산 캐파 부족. 국내 바이오 CDMO 수주 모멘텀 점검.','삼성바이오로직스','매수','+16%','한지우','2026-06-09'),
('배당','안정','down','리츠, 금리 정점 통과 후 재평가 구간','기준금리 인하 사이클 진입 시 리츠 배당 매력 부각. 우량 오피스·물류 리츠 선호.','ESR켄달스퀘어리츠','매수','+13%','박준영','2026-06-06');

insert into public.events (kind,name,sector,actual,consensus,surprise,price_move,tone) values
('earnings','한미반도체','2차전지 장비','1,840원','1,420원','+29.6%','+8.2%','up'),
('earnings','JYP Ent.','엔터','1,210원','1,050원','+15.2%','+5.4%','up'),
('earnings','LG화학','화학','3,920원','4,510원','-13.1%','-4.1%','down'),
('earnings','현대차','자동차','9,640원','8,800원','+9.5%','+2.7%','up'),
('earnings','카카오','인터넷','410원','520원','-21.2%','-6.3%','down');
insert into public.events (kind,name,sector,detail,ref_date,surprise,tone) values
('action','삼성전자','자사주 소각','발행주식 3.2조원 규모 소각','06.20','수급 개선','up'),
('action','POSCO홀딩스','특별배당','주당 5,000원 (시가배당 1.3%)','06.28','배당 매력','up'),
('action','NAVER','인적분할','웹툰 사업부 분할 상장 추진','07.15','가치 재평가','up'),
('action','셀트리온','액면분할','5,000원→500원 (10:1)','07.01','거래 활성화','up'),
('action','CJ제일제당','유상증자','시설투자 목적 4,000억','06.25','단기 희석','down');

insert into public.themes (name,concentration,ret_1m,state,pos_x,pos_y) values
('AI 반도체',9.4,14.2,'Leadership',32,42),
('전력기기',6.1,11.0,'Acceleration',64,30),
('2차전지',7.0,-3.2,'Cooling',50,68),
('바이오',4.4,6.8,'Emerging',80,58),
('방산',3.6,8.1,'Emerging',18,72),
('엔터',2.8,4.0,'Emerging',84,80),
('조선',3.2,9.5,'Acceleration',43,22),
('금융/배당',5.2,2.1,'Cooling',74,46),
('로봇',2.4,-1.5,'Reversal',24,24);

insert into public.market_snapshot (snapshot_date,kospi,kospi_chg,kosdaq,kosdaq_chg,usdkrw,usdkrw_chg,foreign_net,inst_net,retail_net,strong_sectors,weak_sectors,ai_summary) values
('2026-06-16','2,742.18','+0.84%','861.40','-0.37%','1,371.5','+0.21%','+1,720억','-570억','-1,150억',
 '[{"name":"반도체","chg":"+2.4%"},{"name":"전력기기","chg":"+1.9%"},{"name":"조선","chg":"+1.6%"}]',
 '[{"name":"2차전지","chg":"-1.8%"},{"name":"화학","chg":"-1.2%"},{"name":"인터넷","chg":"-0.9%"}]',
 '외국인이 순매수로 돌아서며 반도체·전력기기가 지수를 끌어올렸습니다. 다만 일부 주도 테마는 과열 구간에 진입해, 신규 진입보다 분할 대응을 권고합니다. 코스닥은 개인 매도로 약세 — 중소형 성장주는 변동성 확대에 유의하세요.')
on conflict (snapshot_date) do update set
  ai_summary = excluded.ai_summary;

insert into public.global_research (kind,title,badge,body) values
('overnight','미 증시, AI·반도체 주도 상승','AI 요약','{"rows":[{"name":"S&P 500","chg":"+0.72%"},{"name":"나스닥","chg":"+1.18%"},{"name":"엔비디아","chg":"+2.41%"}],"note":"엔비디아 신제품 기대에 반도체 동반 강세. 국내 HBM 밸류체인에 우호적."}'),
('earnings','이번 주 실적 캘린더','98종목 추적','{"rows":[{"name":"마이크론","when":"오늘 장마감","eps":"EPS 1.82$"},{"name":"오라클","when":"오늘 장마감","eps":"EPS 1.45$"},{"name":"엔비디아","when":"06.18","eps":"EPS 0.78$"}]}'),
('callsummary','넷마블 4Q 컨퍼런스콜','AI 요약','{"points":["신작 2종 글로벌 동시 출시로 매출 가이던스 상향","마케팅비 효율화로 영업이익률 개선 지속","자체 IP 비중 확대 → 수익성 레버리지 기대"]}');

insert into public.insights (tab,tag,title,author,role,summary,grad,channel_url) values
('analyst','반도체','HBM 수급, 이번 주 체크포인트 3가지','김도현','반도체 수석연구원','마이크론 가이던스 상향이 의미하는 것. 채널 재고와 가격 협상력 변화를 정리했습니다.','135deg,#0b59d5,#0090ff','https://t.me/yujin_semi'),
('analyst','2차전지','유럽 EV 판매 반등, 진짜일까?','이서연','2차전지 책임연구원','5월 등록대수와 보조금 정책을 교차 검증. 소재 업체별 가동률 코멘트 공유.','135deg,#194386,#1772f8','https://t.me/yujin_battery'),
('analyst','배당/금융','밸류업 2차 명단, 누가 들어올까','박준영','금융/배당 전략가','배당성향·자사주 소각 여력으로 거른 후보 리스트. 실망 매물 주의 종목도.','135deg,#062554,#006bd6','https://t.me/yujin_value'),
('analyst','AI인프라','전력기기, 미국 수주 잔고가 말한다','정민수','산업재 연구원','변압기 리드타임과 북미 증설 계획. 수주잔고 피크아웃 우려에 대한 반론.','135deg,#0090ff,#0b59d5','https://t.me/yujin_power'),
('analyst','바이오','비만치료제, CDMO 수주 레이스 시작','한지우','헬스케어 연구원','GLP-1 캐파 부족이 만드는 기회. 국내 위탁생산 3社 수주 진행 상황 업데이트.','135deg,#1772f8,#0090ff','https://t.me/yujin_bio'),
('market','데일리 시황','오늘의 마켓 톤 — 외국인 순매수 전환','리서치센터','데일리 퀀트 시그널','반도체·전력기기 주도로 코스피 강세. 주도 테마 과열 구간은 분할 대응을 권고합니다.','135deg,#0b59d5,#194386','https://t.me/yujin_daily'),
('market','수급','외국인이 다시 사는 업종은','리서치센터','투자자별 수급 분석','외국인 +1,720억 순매수. 반도체·조선·전력기기에 자금 집중, 인터넷·화학은 매도 우위.','135deg,#194386,#006bd6','https://t.me/yujin_daily'),
('market','밤사이 시황','미 증시 마감 — AI·반도체 강세','리서치센터','글로벌 오버나잇 브리프','S&P500 +0.72%, 나스닥 +1.18%. 엔비디아 강세로 국내 HBM 밸류체인에 우호적.','135deg,#0090ff,#0b59d5','https://t.me/yujin_global'),
('stock','어닝 서프라이즈','한미반도체, 컨센 +29% 상회','리서치센터','종목 코멘트','2차전지 장비 매출 인식 가속. 당일 +8.2%. 수주잔고 기준 추가 상향 여력 점검.','135deg,#e0344b,#0b59d5','https://t.me/yujin_event'),
('stock','자사주','삼성전자, 3.2조 자사주 소각','리서치센터','코퍼레이트 액션','유통주식 축소로 수급 개선. 밸류업 흐름 속 주주환원 강화 시그널로 해석.','135deg,#0b59d5,#0090ff','https://t.me/yujin_event'),
('stock','분할','NAVER 웹툰 인적분할 추진','리서치센터','코퍼레이트 액션','사업부 가치 재평가 기대. 분할 일정과 합산 시가총액 시나리오를 정리했습니다.','135deg,#194386,#1772f8','https://t.me/yujin_event');
