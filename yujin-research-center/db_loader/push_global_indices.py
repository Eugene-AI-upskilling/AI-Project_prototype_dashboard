# -*- coding: utf-8 -*-
"""해외 주요 지수(NASDAQ·S&P500)를 yfinance로 가져와 Supabase global_indices에 적재.

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
]


def _last_two_closes(ticker, date):
    """date(YYYY-MM-DD) 이하의 마지막 종가·직전 거래일 종가·기준일 반환."""
    import yfinance as yf
    d = _dt.date.fromisoformat(date)
    start = (d - _dt.timedelta(days=14)).isoformat()
    end = (d + _dt.timedelta(days=1)).isoformat()   # end exclusive → date 포함
    hist = yf.Ticker(ticker).history(start=start, end=end, auto_adjust=False)
    if hist is None or hist.empty:
        return None, None, None
    closes = hist["Close"].dropna()
    if closes.empty:
        return None, None, None
    cur = float(closes.iloc[-1])
    prev = float(closes.iloc[-2]) if len(closes) >= 2 else None
    as_of = closes.index[-1].date().isoformat()
    return cur, prev, as_of


def fetch(date=None):
    """[{symbol,name,price,change_pct,as_of}, ...] (가능한 것만)."""
    date = date or _dt.date.today().isoformat()
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
        chg = round((cur - prev) / prev * 100, 2) if prev else None
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
