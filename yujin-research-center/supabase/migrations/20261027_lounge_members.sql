-- AI 리서치 라운지: 회원(고객 · 애널리스트) 가입 승인
-- 적용: Supabase 대시보드 → SQL Editor 에 붙여넣고 Run (기존 테이블은 건드리지 않음, 다시 실행해도 안전)
--
-- 규칙
--  · 사용자는 테이블에 직접 쓰지 못한다. lounge_request()로 본인 가입 · 직원 등록을 '승인 대기'로만 요청할 수 있다.
--  · 고객 승인은 승인된 직원(analyst · admin)이, 직원 승인은 admin만 lounge_decide()로 한다. 본인 승인 불가.
--  · 조회는 본인 행, 승인된 직원은 전체.

create table if not exists public.lounge_members (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  email        text,
  name         text not null default '',
  role         text not null default 'customer' check (role in ('customer','analyst','admin')),
  seg          text,          -- 법인 | WM | 직원
  cust_type    text,          -- am | ia | dma | etc | hnw
  persona      text,          -- am | ia | dma | hnw
  org          text,          -- 소속 기관(법인) · 부서(직원)
  branch       text,          -- WM 지점
  invite_code  text,
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  note         text,
  requested_at timestamptz not null default now(),
  decided_at   timestamptz,
  decided_by   uuid references auth.users(id)
);
alter table public.lounge_members enable row level security;

create or replace function public.lounge_is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.lounge_members
                where user_id = auth.uid() and role in ('analyst','admin') and status = 'approved');
$$;

create or replace function public.lounge_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.lounge_members
                where user_id = auth.uid() and role = 'admin' and status = 'approved');
$$;

drop policy if exists lounge_members_select on public.lounge_members;
create policy lounge_members_select on public.lounge_members for select to authenticated
  using (user_id = auth.uid() or public.lounge_is_staff());

create or replace function public.lounge_request(p jsonb) returns public.lounge_members
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  r   text := coalesce(p->>'role', 'customer');
  res public.lounge_members;
begin
  if uid is null then raise exception '로그인이 필요합니다'; end if;
  if r not in ('customer','analyst') then raise exception '요청할 수 없는 역할'; end if;
  if length(trim(coalesce(p->>'name',''))) < 2 then raise exception '이름을 입력해 주세요'; end if;
  insert into public.lounge_members as m (user_id, email, name, role, seg, cust_type, persona, org, branch, invite_code, status, requested_at)
  values (uid, (select email from auth.users where id = uid), trim(p->>'name'), r, p->>'seg', p->>'cust_type',
          p->>'persona', p->>'org', p->>'branch', p->>'invite_code', 'pending', now())
  on conflict (user_id) do update set
    name = excluded.name, seg = excluded.seg, cust_type = excluded.cust_type, persona = excluded.persona,
    org = excluded.org, branch = excluded.branch, invite_code = excluded.invite_code,
    role   = case when m.role = 'admin' then 'admin' else excluded.role end,
    status = case when m.role = 'admin' or (m.status = 'approved' and m.role = excluded.role) then m.status else 'pending' end,
    requested_at = case when m.role = excluded.role and m.status = 'approved' then m.requested_at else now() end
  returning * into res;
  return res;
end $$;

create or replace function public.lounge_decide(target uuid, decision text, memo text default null) returns public.lounge_members
language plpgsql security definer set search_path = public as $$
declare t public.lounge_members; res public.lounge_members;
begin
  if decision not in ('approved','rejected','pending') then raise exception '잘못된 결정'; end if;
  select * into t from public.lounge_members where user_id = target;
  if t.user_id is null then raise exception '회원을 찾을 수 없습니다'; end if;
  if target = auth.uid() then raise exception '본인은 승인할 수 없습니다'; end if;
  if t.role = 'customer' and not public.lounge_is_staff() then raise exception '권한이 없습니다'; end if;
  if t.role in ('analyst','admin') and not public.lounge_is_admin() then raise exception '직원 승인은 관리자만 할 수 있습니다'; end if;
  update public.lounge_members set status = decision, note = memo, decided_at = now(), decided_by = auth.uid()
   where user_id = target returning * into res;
  return res;
end $$;

revoke all on function public.lounge_request(jsonb) from public, anon;
revoke all on function public.lounge_decide(uuid, text, text) from public, anon;
revoke all on function public.lounge_is_staff() from public, anon;
revoke all on function public.lounge_is_admin() from public, anon;
grant execute on function public.lounge_request(jsonb) to authenticated;
grant execute on function public.lounge_decide(uuid, text, text) to authenticated;
grant execute on function public.lounge_is_staff() to authenticated;
grant execute on function public.lounge_is_admin() to authenticated;
grant select on public.lounge_members to authenticated;
revoke insert, update, delete on public.lounge_members from anon, authenticated;

-- 첫 관리자 (이미 가입된 계정이면 관리자로 지정)
insert into public.lounge_members (user_id, email, name, role, seg, status, decided_at)
select id, email, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email,'@',1)),
       'admin', '직원', 'approved', now()
from auth.users where lower(email) = 'anjs920820@gmail.com'
on conflict (user_id) do update set role = 'admin', status = 'approved', decided_at = now();
