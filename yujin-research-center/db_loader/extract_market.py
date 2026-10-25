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


def _asof_date(row, path):
    """스냅샷 날짜 = CSV 의 date 컬럼(실제 거래일) 우선, 없으면 파일명.

    파일명은 '수집을 돌린 날'이다. 이 파이프라인은 07:25 에도 도는데 그 시각 KRX 최신 종가는
    전일 것이라, 파일명을 그대로 믿으면 9/17 종가가 9/18 시황으로 올라간다(실제로 그랬다).
    """
    v = str(row.get("date") or "").strip()[:10]
    return v if re.fullmatch(r"\d{4}-\d{2}-\d{2}", v) else config.date_from_path(path)


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


def _sum_eok(values):
    """['+28,350억', '-1,620억'] → '+26,730억'. 하나도 못 읽으면 None."""
    total, ok = 0, False
    for v in values:
        try:
            total += int(str(v).replace("억", "").replace(",", "").replace("+", ""))
            ok = True
        except (ValueError, AttributeError, TypeError):
            pass
    return f"{'+' if total >= 0 else ''}{total:,}억" if ok else None


def _apply_kis_flows(snap, date):
    """투자자 순매수를 KIS 실측치로 갱신한다.

    · 개인(retail)은 원래 -(외국인+기관) 추정이었다 — 기타법인·연기금이 빠져 실제와 어긋난다.
    · 외국인/기관도 KIS 를 우선한다. market_tone CSV 는 수집 실패한 날 전 항목이 '+0십억원'
      으로 채워져 나오는데, 그대로 두면 화면에 0원으로 표시된다.
      (2026-08-12 기준 KIS 값과 CSV 값이 정확히 일치함을 확인 — 같은 KRX 원천이다.)

    KIS 키가 없거나 조회 실패면 아무것도 바꾸지 않는다(기존 CSV 값 유지).
    """
    from . import kis
    if not kis.available():
        return
    got = kis.market_snapshot(date)
    if not got:
        return

    picked = {"foreign": [], "inst": [], "retail": []}
    for market in ("kospi", "kosdaq"):
        row = got.get(market) or {}
        for field in picked:
            eok = _eok(row.get(field))
            if eok is None:
                continue
            if snap.get("flows") and market in snap["flows"]:
                snap["flows"][market][field] = eok
            picked[field].append(eok)

    for field, key in (("foreign", "foreign_net"), ("inst", "inst_net"), ("retail", "retail_net")):
        total = _sum_eok(picked[field])
        if total is not None:
            snap[key] = total


def extract(date=None, enrich=True, summary=True):
    path = _latest_valid_path(date)
    if not path or not os.path.exists(path):
        return {"market_snapshot": None, "_source": None}
    df = _read(path)
    if df.empty:
        return {"market_snapshot": None, "_source": path}
    r = df.iloc[0]

    snap = {
        "snapshot_date": _asof_date(r, path),
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

    # ── 지수 레벨/등락률/환율 보강 ──
    # 우선순위: ① KIS 확정 지수 → ② market_tone 저장값 → ③ yfinance → ④ 직전종가×등락률 역산.
    # CSV 를 1순위로 두지 않는 건, 수집 실패한 날 전일 값이 그대로 복사돼 들어오기 때문이다
    # (2026-08-13 파일이 08-12 의 6,579.04 를 담고 있었다). KIS 는 마감 직후 확정치를 준다.
    if enrich and snap["snapshot_date"]:
        d = snap["snapshot_date"]
        kis_lv = {}
        try:
            from . import kis
            if kis.available():
                kis_lv = kis.market_snapshot(d)
        except Exception as e:
            print("  [warn] KIS 지수 조회 실패:", e)

        try:
            from . import market_levels
            lv = market_levels.fetch_levels(d)
            for market, yf_tk in (("kospi", "^KS11"), ("kosdaq", "^KQ11")):
                got = kis_lv.get(market) or {}
                if got.get("chg"):
                    snap[market + "_chg"] = got["chg"]
                elif not snap.get(market + "_chg"):
                    snap[market + "_chg"] = lv.get(market + "_chg")
                snap[market] = (got.get("level") or _saved_level(r.get(market + "_level"))
                                or lv.get(market)
                                or _level(market_levels.prev_close(yf_tk, d), snap.get(market + "_chg")))
            if lv.get("usdkrw"):
                snap["usdkrw"] = lv["usdkrw"]; snap["usdkrw_chg"] = lv.get("usdkrw_chg")
        except Exception as e:
            print("  [warn] 지수/환율 보강 실패:", e)

        # ── 투자자 순매수: CSV → KIS 실측 ──
        try:
            _apply_kis_flows(snap, snap["snapshot_date"])
        except Exception as e:
            print("  [warn] KIS 수급 갱신 실패(CSV 값 유지):", e)

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
