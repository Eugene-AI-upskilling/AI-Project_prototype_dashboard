# -*- coding: utf-8 -*-
"""데일리 market_tone → market_snapshot 레코드 (오늘의 시황).

source: market_tone_<YYYYMMDD>.csv
  - kospi_return / kosdaq_return                          → 등락률
  - foreign/institution _kospi/_kosdaq _net_buy           → KOSPI/KOSDAQ 분리 수급
  - strong_sectors / weak_sectors                         → 강세/약세 업종

수집 실패한 날("KRX 화면 raw 필요"/등락률 None)은 자동으로 건너뛰고
가장 최근 '정상' 파일을 사용한다. 지수 레벨/환율은 yfinance, AI요약은 텔레그램.
"""
import os, glob, re
import pandas as pd
from . import config, transform as T


def _read(path):
    try:
        return pd.read_csv(path)
    except UnicodeDecodeError:
        return pd.read_csv(path, encoding="cp949")


def _is_valid(r):
    """수급/등락률이 실제로 들어있는 행인지."""
    bad = lambda v: v is None or (isinstance(v, float) and pd.isna(v)) or ("raw" in str(v)) or str(v).strip() == ""
    return not bad(r.get("kospi_return")) and not bad(r.get("foreign_kospi_net_buy"))


def _latest_valid_path(date=None):
    """date 지정 시 그 파일, 아니면 최신 '정상' market_tone."""
    if date:
        p = config.market_tone_path(date)
        return p if p and os.path.exists(p) else None
    folder = os.path.join(config.DAILY_DIR, "data", "raw")
    files = sorted(glob.glob(os.path.join(folder, "market_tone_*.csv")),
                   key=lambda f: re.search(r"(\d{8})", os.path.basename(f)).group(1)
                   if re.search(r"(\d{8})", os.path.basename(f)) else "", reverse=True)
    for f in files:
        try:
            df = _read(f)
            if not df.empty and _is_valid(df.iloc[0]):
                return f
        except Exception:
            continue
    return files[0] if files else None


def _eok(v):
    """'-356십억원' → '-3,560억'. 결측/placeholder는 None."""
    if v is None or "raw" in str(v) or str(v).strip() in ("", "nan"):
        return None
    return T.billion_to_eok(v)


def _retail(f, i):
    """개인 ≈ -(외국인+기관). f,i는 '+X억' 문자열."""
    def n(x):
        return int(x.replace("억", "").replace(",", "")) if x else None
    a, b = n(f), n(i)
    if a is None or b is None:
        return None
    v = -(a + b)
    return f"{'+' if v >= 0 else ''}{v:,}억"


def _saved_level(v):
    """market_tone에 저장된 지수 레벨(있으면 그대로 사용)."""
    if v is None:
        return None
    s = str(v).strip()
    return None if (s in ("", "nan") or "raw" in s) else s


def _level(prev, chg):
    """직전 종가 × (1+당일 등락률) → 지수 레벨 문자열. (yfinance 종가 지연 보정)"""
    if prev is None or not chg:
        return None
    try:
        r = float(str(chg).replace("%", "").replace("+", "")) / 100
    except ValueError:
        return None
    return f"{prev * (1 + r):,.2f}"


def _build_flows(r):
    """KOSPI/KOSDAQ 투자자별 순매수."""
    fk, ik = _eok(r.get("foreign_kospi_net_buy")), _eok(r.get("institution_kospi_net_buy"))
    fq, iq = _eok(r.get("foreign_kosdaq_net_buy")), _eok(r.get("institution_kosdaq_net_buy"))
    if not fk and not fq:
        return None
    return {
        "kospi":  {"foreign": fk, "inst": ik, "retail": _retail(fk, ik)},
        "kosdaq": {"foreign": fq, "inst": iq, "retail": _retail(fq, iq)},
    }


def extract(date=None, enrich=True, summary=True):
    path = _latest_valid_path(date)
    if not path or not os.path.exists(path):
        return {"market_snapshot": None, "_source": None}
    df = _read(path)
    if df.empty:
        return {"market_snapshot": None, "_source": path}
    r = df.iloc[0]

    snap = {
        "snapshot_date": config.date_from_path(path),
        "kospi": None, "kospi_chg": T.clean(r.get("kospi_return")),
        "kosdaq": None, "kosdaq_chg": T.clean(r.get("kosdaq_return")),
        "usdkrw": None, "usdkrw_chg": None,
        "foreign_net": _eok(r.get("foreign_net_buy")),       # 합계(레거시 호환)
        "inst_net": _eok(r.get("institution_net_buy")),
        "retail_net": _retail(_eok(r.get("foreign_net_buy")), _eok(r.get("institution_net_buy"))),
        "flows": _build_flows(r),                            # KOSPI/KOSDAQ 분리
        "strong_sectors": T.parse_sector_str(r.get("strong_sectors"), 3),
        "weak_sectors": T.parse_sector_str(r.get("weak_sectors"), 3),
        "ai_summary": None,
    }

    # ── yfinance 보강: 환율 + 지수 레벨 ──
    # 등락률은 market_tone(=daily_report가 당일 yfinance close-to-close로 계산·저장)을 사용.
    # yfinance엔 당일 종가가 늦게 올라와(지연) 직접 못 읽을 수 있으므로,
    # 지수 레벨 = 직전 거래일 종가 × (1+당일 등락률) 로 재구성한다.
    if enrich and snap["snapshot_date"]:
        try:
            from . import market_levels
            d = snap["snapshot_date"]
            lv = market_levels.fetch_levels(d)
            if not snap.get("kospi_chg"):  snap["kospi_chg"] = lv.get("kospi_chg")
            if not snap.get("kosdaq_chg"): snap["kosdaq_chg"] = lv.get("kosdaq_chg")
            # 레벨: ① market_tone 저장값(정확) → ② 직전종가×등락률 → ③ yfinance
            snap["kospi"]  = _saved_level(r.get("kospi_level"))  or _level(market_levels.prev_close("^KS11", d), snap.get("kospi_chg"))  or lv.get("kospi")
            snap["kosdaq"] = _saved_level(r.get("kosdaq_level")) or _level(market_levels.prev_close("^KQ11", d), snap.get("kosdaq_chg")) or lv.get("kosdaq")
            if lv.get("usdkrw"):
                snap["usdkrw"] = lv["usdkrw"]; snap["usdkrw_chg"] = lv.get("usdkrw_chg")
        except Exception as e:
            print("  [warn] yfinance 보강 실패:", e)

    # ── AI 시황 요약: 텔레그램(허재환 채널) ──
    if summary:
        try:
            from . import summarize_market
            s = summarize_market.build_ai_summary()
            if s:
                snap["ai_summary"] = s
        except Exception as e:
            print("  [warn] ai_summary 생성 실패:", e)

    return {"market_snapshot": snap, "_source": path}


if __name__ == "__main__":
    import json, sys, io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    print(json.dumps(extract(summary=False), ensure_ascii=False, indent=2, default=str))
