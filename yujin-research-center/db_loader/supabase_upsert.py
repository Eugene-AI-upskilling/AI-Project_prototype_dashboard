# -*- coding: utf-8 -*-
"""추출 레코드를 Supabase에 적재 (service_role 키, RLS 우회).

환경변수(.env):
  SUPABASE_URL=https://xxxx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=eyJ...   ← 절대 프론트/깃에 노출 금지
"""
import os, json, requests

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except ImportError:
    pass

URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def _headers(extra=None):
    h = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
    if extra:
        h.update(extra)
    return h


def _check():
    if not URL or not KEY:
        raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 미설정 (.env 확인)")


def replace_table(table, rows, on_conflict=None):
    """기존 행 전체 삭제 후 새로 삽입 (스냅샷 교체).

    DELETE→INSERT 는 원자적이지 않아서, INSERT 가 한 번 더 나가면(네트워크 재시도, 작업
    중복 실행) 같은 스냅샷이 두 벌 남는다. 실제로 홈페이지 테마가 15개→30개로 두 번씩
    보였고 theme_constituents/theme_news/events 도 같은 식으로 불어나 있었다. 그래서
      · DELETE 결과를 확인하고(조용히 실패하면 중복의 출발점이 된다),
      · on_conflict 가 주어지면 INSERT 를 merge 로 보내 재시도가 중복을 만들지 못하게 한다.
    """
    _check()
    if rows is None:
        return 0
    if isinstance(rows, dict):
        rows = [rows]
    res = requests.delete(f"{URL}/rest/v1/{table}?id=gte.0",
                          headers=_headers({"Prefer": "return=minimal"}), timeout=30)
    res.raise_for_status()
    if not rows:
        return 0
    url = f"{URL}/rest/v1/{table}"
    prefer = "return=minimal"
    if on_conflict:
        url += f"?on_conflict={on_conflict}"
        prefer = "resolution=merge-duplicates,return=minimal"
    res = requests.post(url, headers=_headers({"Prefer": prefer}),
                        data=json.dumps(rows, default=str), timeout=60)
    res.raise_for_status()
    return len(rows)


def upsert(table, rows, on_conflict):
    """on_conflict 기준 merge (예: market_snapshot=snapshot_date)."""
    _check()
    if isinstance(rows, dict):
        rows = [rows]
    if not rows:
        return 0
    res = requests.post(f"{URL}/rest/v1/{table}?on_conflict={on_conflict}",
                        headers=_headers({"Prefer": "resolution=merge-duplicates,return=minimal"}),
                        data=json.dumps(rows, default=str), timeout=60)
    res.raise_for_status()
    return len(rows)


def replace_by_key(table, rows, key):
    """rows 로 upsert 한 뒤, 이번 목록에 없는 key 행만 삭제 (빈 화면 구간 없는 스냅샷 교체).
    id 컬럼이 없는 테이블(global_highs 등)용."""
    _check()
    if not rows:
        return 0
    n = upsert(table, rows, key)
    keep = ",".join('"%s"' % str(r[key]).replace('"', '') for r in rows)
    res = requests.delete(f"{URL}/rest/v1/{table}?{key}=not.in.({keep})",
                          headers=_headers({"Prefer": "return=minimal"}), timeout=30)
    res.raise_for_status()
    return n


def set_by_filter(table, column, value, row):
    """column=value 행이 있으면 PATCH(같은 id 유지), 없으면 INSERT.
    global_research 처럼 id 가 identity 이고 프론트가 첫 행을 읽는 테이블용."""
    _check()
    res = requests.patch(f"{URL}/rest/v1/{table}?{column}=eq.{value}",
                         headers=_headers({"Prefer": "return=representation"}),
                         data=json.dumps(row, default=str), timeout=30)
    res.raise_for_status()
    if res.json():
        return len(res.json())
    res = requests.post(f"{URL}/rest/v1/{table}", headers=_headers({"Prefer": "return=minimal"}),
                        data=json.dumps(row, default=str), timeout=30)
    res.raise_for_status()
    return 1


def delete_older(table, column, cutoff):
    """column < cutoff 인 행 삭제 (예: 오래된 딥리서치 정리)."""
    _check()
    res = requests.delete(f"{URL}/rest/v1/{table}?{column}=lt.{cutoff}",
                          headers=_headers({"Prefer": "return=minimal"}), timeout=30)
    res.raise_for_status()


def fetch_column(table, column):
    """테이블의 특정 컬럼 값 목록(증분 처리 시 중복 스킵용)."""
    _check()
    res = requests.get(f"{URL}/rest/v1/{table}?select={column}", headers=_headers(), timeout=30)
    res.raise_for_status()
    return [row[column] for row in res.json() if row.get(column)]


def push_all(bundle):
    """run.assemble() 결과를 테이블별로 적재."""
    out = {}
    if bundle.get("themes"):
        out["themes"] = replace_table("themes", bundle["themes"], "name,week_of")
    if bundle.get("events"):
        out["events"] = replace_table("events", bundle["events"], "kind,ticker,name,ref_date,detail")
    if bundle.get("market_snapshot"):
        out["market_snapshot"] = upsert("market_snapshot", bundle["market_snapshot"], "snapshot_date")
    # 테마 Long/Short 시그널
    sig = []
    # 모든 행 키를 동일하게(누락은 None) — PostgREST 일괄 insert는 키 집합 일치 필요
    for i, x in enumerate(bundle.get("long_signal") or [], 1):
        sig.append({"side": "long", "rank": i, "name": x.get("name"), "themes": x.get("themes"),
                    "n_themes": x.get("n_themes"), "balance_change": None, "ret_1w": x.get("ret_1w")})
    for i, x in enumerate(bundle.get("short_signal") or [], 1):
        sig.append({"side": "short", "rank": i, "name": x.get("name"), "themes": x.get("themes"),
                    "n_themes": None, "balance_change": x.get("balance_change"), "ret_1w": x.get("ret_1w")})
    if sig:
        out["theme_signals"] = replace_table("theme_signals", sig, "side,rank")
    if bundle.get("global_quotes"):
        out["global_quotes"] = upsert("global_quotes", bundle["global_quotes"], "ticker")
    if bundle.get("global_indices"):
        out["global_indices"] = upsert("global_indices", bundle["global_indices"], "symbol")
    if bundle.get("theme_constituents"):
        out["theme_constituents"] = replace_table("theme_constituents", bundle["theme_constituents"],
                                                   "theme_name,stock_code,week_of")
    if bundle.get("theme_news"):
        out["theme_news"] = replace_table("theme_news", bundle["theme_news"], "theme_name,url")
    return out
