-- 가져오기 후 실행: id를 직접 넣은 테이블의 자동 번호(시퀀스)를 최댓값 다음으로 맞춘다.
-- 이걸 안 하면 이후 db_loader가 새 행을 넣을 때 "duplicate key" 오류가 난다.
select setval(pg_get_serial_sequence('global_research','id'),    (select coalesce(max(id),1) from global_research));
select setval(pg_get_serial_sequence('themes','id'),             (select coalesce(max(id),1) from themes));
select setval(pg_get_serial_sequence('theme_constituents','id'), (select coalesce(max(id),1) from theme_constituents));
select setval(pg_get_serial_sequence('theme_news','id'),         (select coalesce(max(id),1) from theme_news));
select setval(pg_get_serial_sequence('theme_signals','id'),      (select coalesce(max(id),1) from theme_signals));
select setval(pg_get_serial_sequence('reports','id'),            (select coalesce(max(id),1) from reports));
select setval(pg_get_serial_sequence('card_news','id'),          (select coalesce(max(id),1) from card_news));
select setval(pg_get_serial_sequence('events','id'),             (select coalesce(max(id),1) from events));
select setval(pg_get_serial_sequence('insights','id'),           (select coalesce(max(id),1) from insights));

-- 확인: 테이블별 행 수 (export_summary.json과 같아야 함)
select 'market_snapshot' t, count(*) from market_snapshot union all select 'reports', count(*) from reports
union all select 'card_news', count(*) from card_news union all select 'themes', count(*) from themes
union all select 'stocks', count(*) from stocks union all select 'quant_stock_stats', count(*) from quant_stock_stats;
