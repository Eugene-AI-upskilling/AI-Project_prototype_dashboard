# -*- coding: utf-8 -*-
"""yfinance로 지수/환율 레벨 보강 (market_snapshot 의 미보유 항목).

KOSPI ^KS11 · KOSDAQ ^KQ11 · USD/KRW KRW=X
지정 날짜(snapshot_date) 기준의 종가와 직전 거래일 대비 등락률을 계산.
오프라인/실패 시 빈 dict 반환(안전 폴백).
"""
import datetime as _dt

TICKERS = {"kospi": "^KS11", "kosdaq": "^KQ11", "usdkrw": "KRW=X"}


def _close_and_prev(ticker, date):
    """date(YYYY-MM-DD) 이하의 마지막 종가, 직전 거래일 종가 반환."""
    import yfinance as yf
    d = _dt.date.fromisoformat(date)
    start = (d - _dt.timedelta(days=14)).isoformat()
    end = (d + _dt.timedelta(days=1)).isoformat()
    hist = yf.Ticker(ticker).history(start=start, end=end, auto_adjust=False)
    if hist is None or hist.empty:
        return None, None
    closes = hist["Close"].dropna()
    if closes.empty:
        return None, None
    cur = float(closes.iloc[-1])
    prev = float(closes.iloc[-2]) if len(closes) >= 2 else None
    return cur, prev


def kr_prev_returns(tickers, period="8d"):
    """국내 종목 yfinance 티커(['005930.KS', '247540.KQ', ...])
       → {ticker: 전일 close-to-close 수익률(%)}."""
    try:
        import yfinance as yf
    except ImportError:
        return {}
    tickers = list(tickers)
    if not tickers:
        return {}
    try:
        data = yf.download(tickers, period=period, auto_adjust=False, progress=False, group_by="ticker")
    except Exception:
        return {}
    out, single = {}, (len(tickers) == 1)
    for tk in tickers:
        try:
            s = (data["Close"] if single else data[tk]["Close"]).dropna()
            if len(s) >= 2:
                out[tk] = round((float(s.iloc[-1]) / float(s.iloc[-2]) - 1) * 100, 2)
        except Exception:
            pass
    return out


def prev_close(ticker, date):
    """snapshot_date 직전 거래일 종가(지수 레벨 계산용)."""
    try:
        import yfinance as yf
    except ImportError:
        return None
    d = _dt.date.fromisoformat(date)
    start = (d - _dt.timedelta(days=14)).isoformat()
    end = d.isoformat()                       # end exclusive → date 전 거래일까지
    try:
        hist = yf.Ticker(ticker).history(start=start, end=end, auto_adjust=False)
        closes = hist["Close"].dropna()
        return float(closes.iloc[-1]) if not closes.empty else None
    except Exception:
        return None


def fetch_levels(date):
    """{kospi, kospi_chg, kosdaq, kosdaq_chg, usdkrw, usdkrw_chg} (가능한 것만)."""
    out = {}
    try:
        import yfinance  # noqa: F401
    except ImportError:
        return out
    for key, tk in TICKERS.items():
        try:
            cur, prev = _close_and_prev(tk, date)
        except Exception:
            cur, prev = None, None
        if cur is None:
            continue
        if key == "usdkrw":
            out["usdkrw"] = f"{cur:,.1f}"
            if prev:
                out["usdkrw_chg"] = _pct(cur, prev)
        else:
            out[key] = f"{cur:,.2f}"
            if prev:
                out[key + "_chg"] = _pct(cur, prev)   # 폴백용(시황 raw에 등락률 없을 때)
    return out


def _pct(cur, prev):
    p = (cur - prev) / prev * 100
    return f"{'+' if p >= 0 else ''}{p:.2f}%"


if __name__ == "__main__":
    import sys, io, json
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    date = sys.argv[1] if len(sys.argv) > 1 else _dt.date.today().isoformat()
    print(json.dumps(fetch_levels(date), ensure_ascii=False, indent=2))
