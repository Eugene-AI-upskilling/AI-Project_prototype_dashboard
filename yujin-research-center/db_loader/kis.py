# -*- coding: utf-8 -*-
"""한국투자증권 Open API 어댑터 — yfinance/추정치를 대체하는 시세·수급 소스.

앱키는 OS 환경변수에서 읽는다 (setx 로 등록한 이름):
    hts_api         = APP KEY
    hts_api_secret  = APP SECRET
없으면 KIS_APP_KEY / KIS_APP_SECRET 을 본다. 둘 다 없으면 available() 이 False 가 되고
호출부는 기존 소스로 폴백한다 — 키가 없다고 파이프라인이 죽지는 않는다.

담당 범위:
  · 지수 레벨/등락률   ← 기존 yfinance ^KS11/^KQ11 (당일 종가 지연 문제)
  · 시장 투자자 순매수 ← 기존 -(외국인+기관) 추정치
  · 종목 일봉/등락률   ← 기존 yfinance 배치 다운로드
환율(USD/KRW)은 KIS 에 해당 API 가 없어 yfinance 를 그대로 쓴다.
"""
import datetime as _dt
import json
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests

BASE = "https://openapi.koreainvestment.com:9443"
_TOKEN_PATH = Path(__file__).resolve().parent / ".kis_token.json"

# 실전 유량제한이 초당 20건이라 호출 간 최소 간격을 둔다(≈16건/초).
# 왕복 지연이 0.7초쯤이라 순차 호출로는 초당 1~2건밖에 못 쓴다. 스레드로 겹쳐 호출하되
# 아래 게이트로 전체 발사 간격을 제한해 유량제한은 지킨다.
_MIN_INTERVAL = 0.12
_last_call = 0.0
_rate_lock = threading.Lock()
_MAX_WORKERS = 6
_BACKOFF = 0.7          # 유량 초과(HTTP 500) 후 물러서는 시간

# 시장 코드: (업종코드, 시장구분)
MARKETS = {"kospi": ("0001", "KSP"), "kosdaq": ("1001", "KSQ")}


class KISUnavailable(RuntimeError):
    """키가 없거나 API 가 응답하지 않아 이 소스를 쓸 수 없는 상태."""


def _env(*names):
    for n in names:
        v = (os.getenv(n) or "").strip()
        if v:
            return v
    return ""


def available():
    """앱키/시크릿이 준비돼 있는지."""
    return bool(_env("hts_api", "KIS_APP_KEY") and _env("hts_api_secret", "KIS_APP_SECRET"))


# ──────────────────────────────────────────────────────────── token

def _token():
    """접근토큰. 24시간 유효하고 재발급 호출에 제한이 있어 파일에 캐싱한다."""
    key = _env("hts_api", "KIS_APP_KEY")
    secret = _env("hts_api_secret", "KIS_APP_SECRET")
    if not key or not secret:
        raise KISUnavailable("hts_api / hts_api_secret 환경변수가 없습니다")

    if _TOKEN_PATH.exists():
        try:
            c = json.loads(_TOKEN_PATH.read_text(encoding="utf-8"))
            if _dt.datetime.now() < _dt.datetime.fromisoformat(c["expires_at"]) - _dt.timedelta(minutes=5):
                return c["access_token"]
        except (ValueError, KeyError, json.JSONDecodeError):
            pass

    r = requests.post(f"{BASE}/oauth2/tokenP", timeout=10,
                      headers={"content-type": "application/json"},
                      json={"grant_type": "client_credentials", "appkey": key, "appsecret": secret})
    if r.status_code != 200:
        raise KISUnavailable(f"토큰 발급 실패 [{r.status_code}] {r.text[:200]}")
    d = r.json()
    tok = d.get("access_token")
    if not tok:
        raise KISUnavailable(f"토큰 응답 이상: {str(d)[:200]}")
    exp = _dt.datetime.now() + _dt.timedelta(seconds=int(d.get("expires_in", 86400)))
    _TOKEN_PATH.write_text(json.dumps({"access_token": tok, "expires_at": exp.isoformat()}),
                           encoding="utf-8")
    return tok


def _get(path, tr_id, params, timeout=30, retries=4):
    """유량제한 간격을 지키며 GET. 타임아웃/일시적 오류는 짧게 재시도한다.

    시장별 투자자매매동향은 300행을 한 번에 내려주느라 응답이 느릴 때가 있어
    기본 타임아웃을 넉넉히 잡는다.
    """
    global _last_call
    last_err = None
    for attempt in range(retries + 1):
        with _rate_lock:                      # 발사 간격만 직렬화(응답 대기는 겹친다)
            gap = time.monotonic() - _last_call
            if gap < _MIN_INTERVAL:
                time.sleep(_MIN_INTERVAL - gap)
            _last_call = time.monotonic()
        try:
            r = requests.get(f"{BASE}{path}", timeout=timeout, params=params, headers={
                "content-type": "application/json; charset=utf-8",
                "authorization": f"Bearer {_token()}",
                "appkey": _env("hts_api", "KIS_APP_KEY"),
                "appsecret": _env("hts_api_secret", "KIS_APP_SECRET"),
                "tr_id": tr_id, "custtype": "P",
            })
        except requests.RequestException as e:
            last_err = e
            if attempt < retries:
                time.sleep(1 + attempt)
                continue
            raise KISUnavailable(f"{path} 통신 실패: {e}") from e

        try:
            body = r.json()
        except ValueError:
            body = {}

        # KIS 는 유량제한 초과를 HTTP 500 + rt_cd=1 로 돌려준다(200 이 아니다).
        # 병렬 호출에서 산발적으로 나므로 물러섰다 재시도하면 대부분 통과한다.
        if r.status_code != 200 or body.get("rt_cd") not in ("0", None):
            detail = f"[{r.status_code}/{body.get('msg_cd')}] {body.get('msg1') or r.text[:120]}"
            if attempt < retries and (r.status_code >= 500 or body.get("msg_cd") == "EGW00201"):
                time.sleep(_BACKOFF * (attempt + 1))
                continue
            raise KISUnavailable(f"{path} {detail}")
        return body
    raise KISUnavailable(f"{path} 실패: {last_err}")


# ─────────────────────────────────────────────── 지수 레벨 + 시장 수급

def _ymd(date):
    """'2026-08-12' / '20260812' → '20260812'."""
    return str(date).replace("-", "")[:8]


def market_daily(market, date):
    """시장별 투자자매매동향(일별). 지수 레벨·등락률·투자자 순매수를 한 번에 준다.

    반환: {level, chg, foreign, inst, retail, date}
      · level/chg 는 표시용 문자열, 순매수 3종은 '+2,835십억원' 형식
        (기존 market_tone CSV 와 같은 표기 → transform.billion_to_eok 재사용)
      · 해당 날짜 행이 없으면 그 이전 최근 영업일 행을 쓴다.
    순매수 원본 단위는 백만원이며, 1,000 으로 나눠 십억원으로 맞춘다.
    """
    iscd, mk = MARKETS[market]
    ymd = _ymd(date)
    body = _get("/uapi/domestic-stock/v1/quotations/inquire-investor-daily-by-market",
                "FHPTJ04040000",
                {"FID_COND_MRKT_DIV_CODE": "U", "FID_INPUT_ISCD": iscd,
                 "FID_INPUT_DATE_1": ymd, "FID_INPUT_ISCD_1": mk,
                 "FID_INPUT_DATE_2": ymd, "FID_INPUT_ISCD_2": iscd})
    rows = body.get("output") or []
    row = next((r for r in rows if r.get("stck_bsop_date") == ymd), None)
    if row is None:
        past = [r for r in rows if str(r.get("stck_bsop_date", "")) <= ymd]
        row = past[0] if past else None
    if row is None:
        raise KISUnavailable(f"{market} {ymd} 데이터 없음")

    def bn(field):
        """백만원 문자열 → '+2,835십억원'."""
        try:
            v = round(float(str(row.get(field, "")).replace(",", "")) / 1000)
        except (ValueError, TypeError):
            return None
        return f"{'+' if v >= 0 else '-'}{abs(v):,}십억원"

    def num(field, nd=2):
        try:
            return f"{float(str(row.get(field, '')).replace(',', '')):,.{nd}f}"
        except (ValueError, TypeError):
            return None

    chg = row.get("bstp_nmix_prdy_ctrt")
    try:
        chg = f"{'+' if float(chg) >= 0 else ''}{float(chg):.2f}%"
    except (ValueError, TypeError):
        chg = None

    return {"date": row.get("stck_bsop_date"), "level": num("bstp_nmix_prpr"), "chg": chg,
            "foreign": bn("frgn_ntby_tr_pbmn"), "inst": bn("orgn_ntby_tr_pbmn"),
            "retail": bn("prsn_ntby_tr_pbmn")}


_snapshot_cache = {}


def market_snapshot(date):
    """{kospi:{...}, kosdaq:{...}} — 실패한 시장은 키가 빠진다.

    지수 레벨과 수급을 서로 다른 호출부(market_levels / extract_market)에서 쓰므로
    같은 날짜에 대해서는 응답을 재사용한다(300행 응답이라 왕복이 비싸다).
    """
    key = _ymd(date)
    if key in _snapshot_cache:
        return _snapshot_cache[key]
    out = {}
    for m in MARKETS:
        try:
            out[m] = market_daily(m, date)
        except (KISUnavailable, requests.RequestException) as e:
            print(f"  [warn] KIS {m} 조회 실패: {e}")
    if out:
        _snapshot_cache[key] = out
    return out


# ────────────────────────────────────────────────────────── 종목 시세

def daily_prices(symbol, start, end):
    """종목 일봉. 최신 → 과거 순. 1회 약 100건 제한."""
    body = _get("/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice",
                "FHKST03010100",
                {"FID_COND_MRKT_DIV_CODE": "J", "FID_INPUT_ISCD": symbol,
                 "FID_INPUT_DATE_1": _ymd(start), "FID_INPUT_DATE_2": _ymd(end),
                 "FID_PERIOD_DIV_CODE": "D", "FID_ORG_ADJ_PRC": "0"})
    return body.get("output2") or []


def price_move(symbol, date, window=10):
    """지정일(없으면 직전 영업일)의 등락률 % (float). 실패 시 None."""
    d = _dt.date.fromisoformat(str(date)[:10]) if "-" in str(date) else \
        _dt.datetime.strptime(_ymd(date), "%Y%m%d").date()
    try:
        rows = daily_prices(symbol, (d - _dt.timedelta(days=window)).strftime("%Y%m%d"),
                            d.strftime("%Y%m%d"))
    except (KISUnavailable, requests.RequestException):
        return None
    ymd = d.strftime("%Y%m%d")
    row = next((r for r in rows if r.get("stck_bsop_date") == ymd), rows[0] if rows else None)
    if not row:
        return None
    # 일봉 응답에는 등락률 필드가 없고 종가·전일대비만 있다 → 직접 계산.
    try:
        clpr = float(str(row["stck_clpr"]).replace(",", ""))
        vrss = float(str(row["prdy_vrss"]).replace(",", ""))   # 부호 포함
    except (KeyError, ValueError, TypeError):
        return None
    prev = clpr - vrss
    return round(vrss / prev * 100, 2) if prev else None


def prev_returns(symbols, date=None):
    """{종목코드: 전일 등락률 %}. 종목당 1콜이라 스레드로 겹쳐 호출한다.

    토큰은 첫 호출 전에 미리 받아둔다 — 스레드들이 동시에 토큰 발급을 때리면
    KIS 쪽 재발급 제한에 걸린다.
    """
    out = {}
    symbols = list(dict.fromkeys(symbols))     # 중복 제거, 순서 유지
    if not available() or not symbols:
        return out
    d = date or _dt.date.today().isoformat()

    try:
        _token()
    except KISUnavailable as e:
        print("  [warn] KIS 토큰 발급 실패:", e)
        return out

    with ThreadPoolExecutor(max_workers=_MAX_WORKERS) as pool:
        for s, v in zip(symbols, pool.map(lambda x: price_move(x, d), symbols)):
            if v is not None:
                out[s] = v
    return out


if __name__ == "__main__":
    import sys
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, OSError):
        pass
    day = sys.argv[1] if len(sys.argv) > 1 else _dt.date.today().isoformat()
    print(f"available = {available()}")
    snap = market_snapshot(day)
    for m, v in snap.items():
        print(f"{m:7} {v['date']} {v['level']} ({v['chg']})  "
              f"외국인 {v['foreign']} / 기관 {v['inst']} / 개인 {v['retail']}")
    print("삼성전자 등락률:", price_move("005930", day))
