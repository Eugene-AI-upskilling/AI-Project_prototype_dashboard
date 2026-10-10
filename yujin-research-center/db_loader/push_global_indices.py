# -*- coding: utf-8 -*-
"""해외 주요 지수(미국·아시아·매크로)를 yfinance로 가져와 Supabase global_indices에 적재.

시황 페이지(market.html) 상단 지수 스트립의 NASDAQ / S&P 500 값을 실데이터로 채운다.
KOSPI·KOSDAQ·USD/KRW는 market_snapshot(국내 파이프라인)에서, 해외 지수는 이 스크립트에서 담당.

사용법 (yujin-research-center 폴더에서):
  python -m db_loader.push_global_indices            # 최신(오늘) 종가 기준
  python -m db_loader.push_global_indices 2026-06-24 # 특정 날짜 이하 마지막 종가
  python -m db_loader.push_global_indices --dry       # 조회만(적재 안 함)

오프라인/실패 시 빈 결과 → 적재를 생략하고 프론트는 기존 값(폴백)을 유지.
"""
import datetime as _dt
import sys
import json

# (symbol=PK, 표시명, yfinance 티커)
INDICES = [
    ("IXIC", "NASDAQ", "^IXIC"),
    ("GSPC", "S&P 500", "^GSPC"),
    ("DJI",  "다우", "^DJI"),
    ("RUT",  "러셀 2000", "^RUT"),
    ("N225", "닛케이 225", "^N225"),
    ("HSI",  "항셍", "^HSI"),
    ("SSEC", "상해종합", "000001.SS"),
    ("VIX",  "VIX", "^VIX"),
    ("TNX",  "미 10년물", "^TNX"),        # 금리(%) — change_pct 는 %p 차이로 저장
    ("DXY",  "달러 인덱스", "DX-Y.NYB"),
]
BP_SYMBOLS = {"TNX"}   # 등락을 비율(%)이 아닌 포인트 차이로 저장


_MARKET_OPEN = None


def us_market_open():
    """미국 정규장이 지금 열려 있는지 — Yahoo marketState 기준 (PC 시계가 틀려도 안전).
    REGULAR 이면 마지막 일봉은 미완성 봉. 조회 실패 시 뉴욕 시각으로 판단."""
    global _MARKET_OPEN
    if _MARKET_OPEN is None:
        try:
            import yfinance as yf
            _MARKET_OPEN = (yf.Ticker("SPY").info or {}).get("marketState") == "REGULAR"
        except Exception:
            from zoneinfo import ZoneInfo
            ny = _dt.datetime.now(ZoneInfo("America/New_York"))
            _MARKET_OPEN = ny.weekday() < 5 and _dt.time(9, 30) <= ny.time() < _dt.time(16, 0)
    return _MARKET_OPEN


def _last_two_closes(ticker, date):
    """date(YYYY-MM-DD) 이하의 마지막 종가·직전 거래일 종가·기준일 반환."""
    import yfinance as yf
    if date is None:      # 최신: PC 시계에 의존하지 않도록 최근 구간을 그대로 받음
        hist = yf.Ticker(ticker).history(period="1mo", auto_adjust=False)
    else:
        d = _dt.date.fromisoformat(date)
        start = (d - _dt.timedelta(days=14)).isoformat()
        end = (d + _dt.timedelta(days=1)).isoformat()   # end exclusive → date 포함
        hist = yf.Ticker(ticker).history(start=start, end=end, auto_adjust=False)
    if hist is None or hist.empty:
        return None, None, None
    closes = hist["Close"].dropna()
    # 장중 실행 시 오늘 미완성 봉 제외 (미국·매크로 지수만 — 아시아는 이미 마감)
    if ticker.startswith("^") and ticker not in ("^N225", "^HSI") and us_market_open() and len(closes) > 1:
        closes = closes.iloc[:-1]
    if closes.empty:
        return None, None, None
    cur = float(closes.iloc[-1])
    prev = float(closes.iloc[-2]) if len(closes) >= 2 else None
    as_of = closes.index[-1].date().isoformat()
    return cur, prev, as_of


def fetch(date=None):
    """[{symbol,name,price,change_pct,as_of}, ...] (가능한 것만)."""
    rows = []
    try:
        import yfinance  # noqa: F401
    except ImportError:
        return rows
    for sym, name, tk in INDICES:
        try:
            cur, prev, as_of = _last_two_closes(tk, date)
        except Exception:
            cur, prev, as_of = None, None, None
        if cur is None:
            continue
        if not prev:
            chg = None
        elif sym in BP_SYMBOLS:
            chg = round(cur - prev, 3)
        else:
            chg = round((cur - prev) / prev * 100, 2)
        rows.append({
            "symbol": sym, "name": name,
            "price": round(cur, 2), "change_pct": chg, "as_of": as_of,
        })
    return rows


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    args = [a for a in sys.argv[1:]]
    dry = "--dry" in args
    date = next((a for a in args if not a.startswith("--")), None)

    rows = fetch(date)
    print(json.dumps(rows, ensure_ascii=False, indent=2))
    if not rows:
        print("⚠ 데이터 없음 (yfinance 실패/오프라인) — 적재 생략")
        return
    if dry:
        print("(--dry) 적재 생략")
        return
    from . import supabase_upsert
    n = supabase_upsert.upsert("global_indices", rows, "symbol")
    print(f"global_indices 적재 완료: {n}건")


if __name__ == "__main__":
    main()
