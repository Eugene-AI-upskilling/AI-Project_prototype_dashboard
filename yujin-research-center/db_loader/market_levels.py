# -*- coding: utf-8 -*-
"""지수/환율 레벨 보강 (market_snapshot 의 미보유 항목).

지수(KOSPI/KOSDAQ)는 한국투자증권 API 가 1순위다. yfinance 는 당일 종가가 늦게 올라와
장 마감 직후 실행하면 값을 못 읽거나 전일 값을 주는 문제가 있었다.
KIS 는 마감 직후 확정 지수를 바로 준다. 키가 없거나 실패하면 기존 yfinance 로 폴백한다.

환율(USD/KRW)은 KIS 에 해당 API 가 없어 계속 yfinance(KRW=X)를 쓴다.
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


def kr_prev_returns(tickers, period="8d", date=None):
    """국내 종목 yfinance 티커(['005930.KS', '247540.KQ', ...])
       → {ticker: 전일 close-to-close 수익률(%)}.

    KIS 를 먼저 쓴다. yfinance 배치는 한 번 실패하면 전체가 {} 로 떨어져 종목 수익률이
    통째로 비는 반면, KIS 는 종목별 호출이라 실패가 해당 종목에만 국한된다.
    (종목당 약 0.7초 — 수백 종목이면 수 분 걸리므로 일배치에서만 쓸 것)
    """
    tickers = list(tickers)
    if not tickers:
        return {}

    try:
        from . import kis
        if kis.available():
            # '005930.KS' → '005930' 으로 되돌려 조회하고, 키는 원래 티커로 유지한다.
            codes = {t: t.split(".")[0] for t in tickers}
            got = kis.prev_returns(list(codes.values()), date=date)
            out = {t: got[c] for t, c in codes.items() if c in got}
            if out:
                return out
            print("  [warn] KIS 전일수익률 0건 → yfinance 폴백")
    except Exception as e:                      # 어떤 이유로든 KIS 실패 시 폴백
        print("  [warn] KIS 전일수익률 실패, yfinance 폴백:", e)

    try:
        import yfinance as yf
    except ImportError:
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
    """{kospi, kospi_chg, kosdaq, kosdaq_chg, usdkrw, usdkrw_chg} (가능한 것만).

    지수는 KIS 우선, 못 채운 항목만 yfinance 로 보완한다.
    """
    out = {}

    try:
        from . import kis
        if kis.available():
            for key, v in kis.market_snapshot(date).items():
                if v.get("level"):
                    out[key] = v["level"]
                if v.get("chg"):
                    out[key + "_chg"] = v["chg"]
    except Exception as e:
        print("  [warn] KIS 지수 조회 실패, yfinance 폴백:", e)

    try:
        import yfinance  # noqa: F401
    except ImportError:
        return out
    for key, tk in TICKERS.items():
        if key in out:                      # KIS 로 이미 채운 지수는 건너뛴다
            continue
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
