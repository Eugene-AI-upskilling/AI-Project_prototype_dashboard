# -*- coding: utf-8 -*-
"""테마 구성종목 + 전일 수익률 (버블 클릭 모달용).

source:
  - 주간: theme_constituents_returns_<date>.xlsx [all_constituents]
          (theme_name_kr · stock_code · stock_name · ret_1w_pct · value_traded_week_bn)
  - 데일리: market_data_<date>.csv (ticker · change_rate = 전일 등락률)
→ 테마별 상위 종목 + 전일 수익률(ret_1d)
"""
import math, os, glob
import pandas as pd
from . import config


def _latest_constituents_file():
    files = glob.glob(os.path.join(config.WEEKLY_DIR, "output", "weekly_report", "*",
                                   "theme_constituents_returns_*.xlsx"))
    return max(files) if files else None


def _daily_info_map():
    """최신 market_data → {종목코드(int): {'chg': 전일등락률, 'market': KOSPI/KOSDAQ}}.
       (yfinance 티커 접미사 판별 + 폴백용)."""
    files = sorted(glob.glob(os.path.join(config.DAILY_DIR, "data", "raw", "market_data_*.csv")))
    if not files:
        return {}
    df = pd.read_csv(files[-1])
    m = {}
    for _, r in df.iterrows():
        try:
            code = int(r["ticker"])
        except (ValueError, TypeError):
            continue
        chg = None
        cr = r.get("change_rate")
        if cr is not None and not (isinstance(cr, float) and math.isnan(cr)):
            try:
                chg = float(str(cr).replace("%", "").replace("+", "").replace(",", ""))
            except ValueError:
                pass
        m[code] = {"chg": chg, "market": r.get("market")}
    return m


def extract(per_theme=15):
    f = _latest_constituents_file()
    if not f:
        return {"theme_constituents": []}
    ac = pd.read_excel(f, sheet_name="all_constituents")
    if "value_traded_week_bn" in ac.columns:
        ac = ac.sort_values("value_traded_week_bn", ascending=False)   # 거래대금 상위 우선
    daily = _daily_info_map()

    items, cnt = [], {}
    for _, r in ac.iterrows():
        theme = str(r.get("theme_name_kr") or "").strip()
        name = str(r.get("stock_name") or "").strip()
        if not theme or not name or cnt.get(theme, 0) >= per_theme:
            continue
        try:
            code = int(r.get("stock_code"))
        except (ValueError, TypeError):
            code = None
        info = daily.get(code, {}) if code is not None else {}
        items.append({
            "theme_name": theme, "stock_name": name,
            "stock_code": f"{code:06d}" if code is not None else None,
            "ret_1w": round(float(r["ret_1w_pct"]), 2) if pd.notna(r.get("ret_1w_pct")) else None,
            "_code": code, "_mkt": info.get("market"), "_chg": info.get("chg"),
        })
        cnt[theme] = cnt.get(theme, 0) + 1

    # ── 전일 수익률: yfinance (국내 종목 KS/KQ), 실패분은 데일리 change_rate 폴백 ──
    tickers = set()
    for it in items:
        if it["_code"] is not None:
            it["_tk"] = f'{it["_code"]:06d}.{"KQ" if str(it["_mkt"]) == "KOSDAQ" else "KS"}'
            tickers.add(it["_tk"])
    try:
        from . import market_levels
        yret = market_levels.kr_prev_returns(list(tickers))
    except Exception as e:
        print("  [warn] yfinance 전일수익률 실패:", e)
        yret = {}

    rows = []
    for it in items:
        ret_1d = yret.get(it.get("_tk"))
        if ret_1d is None:
            ret_1d = it.get("_chg")            # 폴백: 데일리 change_rate
        rows.append({
            "theme_name": it["theme_name"], "stock_name": it["stock_name"],
            "stock_code": it["stock_code"], "ret_1d": ret_1d, "ret_1w": it["ret_1w"],
        })
    return {"theme_constituents": rows}


if __name__ == "__main__":
    import sys, json
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    res = extract()
    print(f"theme_constituents: {len(res['theme_constituents'])}행 / 테마수 {len({r['theme_name'] for r in res['theme_constituents']})}")
    for r in res["theme_constituents"][:6]:
        print(f"  {r['theme_name']:12} {r['stock_name']:10} 전일 {r['ret_1d']}% / 1주 {r['ret_1w']}%")
