# -*- coding: utf-8 -*-
"""월말 KRX 패널 수집 — 퀀트 스튜디오 백테스트의 원천 데이터.

기존 퀀트 페이지(quant.html)는 팩터 CAGR 이 코드에 박힌 상수였고 수익률 경로도
시드 난수(mulberry)로 그린 가짜였다. 실제 숫자를 내려면 '과거 각 시점에 무엇을 알 수
있었는가'가 필요한데, 쓸 수 있는 소스를 따져보면:

  · Supabase quantiwise_stock_daily : 2026-01 이후뿐 (8개월) — 5·10년 백테스트 불가
  · backtest/input/PER.xlsx         : 2010~2026-01, 840종목이지만 Quantiwise 단말
                                      내보내기라 자동 갱신이 안 된다(2026-07 이후 끊긴 그 경로)
  · pykrx (KRX 공식)                : 임의 과거일의 PER/PBR/EPS/BPS/DIV/DPS + 시세/시총을
                                      전 종목으로 준다 → 6개 팩터 전부 계산 가능, 자동 갱신도 됨

그래서 pykrx 로 **월말 스냅샷**만 받는다. 리밸런싱이 월·분기·연 단위라 일별 패널은 필요
없고, 월말만 받으면 10년치가 API 호출 ~500번(10여 분)으로 끝난다.

수집 단위: 월말 거래일 × (KOSPI, KOSDAQ)
  fundamental : BPS, PER, PBR, EPS, DIV, DPS
  cap         : 종가, 시가총액, 거래대금

산출: data/krx_panel.parquet  (date, market, code, close, mcap, value, per, pbr, eps, bps, div)

CLI:
  python -m quant_lab.ingest_krx_panel                 # 최근 10년, 없는 달만 증분
  python -m quant_lab.ingest_krx_panel --years 5
  python -m quant_lab.ingest_krx_panel --full          # 전체 재수집
"""
from __future__ import annotations

import argparse
import sys
import time
from datetime import date
from pathlib import Path

import pandas as pd

BASE = Path(__file__).resolve().parent
DATA = BASE / "data"
PANEL = DATA / "krx_panel.parquet"

MARKETS = ("KOSPI", "KOSDAQ")


def month_end_trading_days(start: date, end: date) -> list[str]:
    """구간 안 각 달의 '실제 마지막 거래일' (YYYYMMDD)."""
    from pykrx import stock

    days = stock.get_previous_business_days(fromdate=start.strftime("%Y%m%d"),
                                            todate=end.strftime("%Y%m%d"))
    frame = pd.DataFrame({"d": pd.to_datetime(days)})
    frame["ym"] = frame["d"].dt.to_period("M")
    return [d.strftime("%Y%m%d") for d in frame.groupby("ym")["d"].max()]


def fetch_one(ymd: str, market: str) -> pd.DataFrame:
    """한 날짜·한 시장의 펀더멘털 + 시총을 합친다."""
    from pykrx import stock

    fund = stock.get_market_fundamental_by_ticker(ymd, market=market)
    cap = stock.get_market_cap_by_ticker(ymd, market=market)
    if fund is None or cap is None or fund.empty or cap.empty:
        raise RuntimeError("빈 응답")

    got = cap.join(fund, how="inner")
    got = got.rename(columns={"종가": "close", "시가총액": "mcap", "거래대금": "value",
                              "PER": "per", "PBR": "pbr", "EPS": "eps",
                              "BPS": "bps", "DIV": "div"})
    keep = [c for c in ("close", "mcap", "value", "per", "pbr", "eps", "bps", "div") if c in got]
    got = got[keep].copy()
    got.index.name = "code"
    got = got.reset_index()
    got.insert(0, "market", market)
    got.insert(0, "date", pd.Timestamp(ymd))
    return got


def run(years: int = 10, full: bool = False, sleep: float = 0.3) -> Path:
    DATA.mkdir(parents=True, exist_ok=True)
    today = date.today()
    start = date(today.year - years, today.month, 1)
    targets = month_end_trading_days(start, today)

    old = None
    if PANEL.exists() and not full:
        old = pd.read_parquet(PANEL)
        have = set(old["date"].dt.strftime("%Y%m%d"))
        # 마지막 달은 아직 안 끝났을 수 있으니 항상 다시 받는다.
        targets = [t for t in targets if t not in have or t == targets[-1]]
        if old is not None and targets:
            old = old[~old["date"].dt.strftime("%Y%m%d").isin(targets)]

    if not targets:
        print("수집할 신규 월말 없음 — 최신 상태")
        return PANEL

    print(f"수집 대상 {len(targets)}개 월말 ({targets[0]} ~ {targets[-1]})")
    rows, failed = [], []
    t0 = time.time()
    for i, ymd in enumerate(targets, 1):
        for market in MARKETS:
            try:
                rows.append(fetch_one(ymd, market))
            except Exception as e:
                failed.append((ymd, market, str(e)[:80]))
            time.sleep(sleep)
        if i % 12 == 0 or i == len(targets):
            print(f"  {i}/{len(targets)}  경과 {time.time() - t0:.0f}s")

    if not rows:
        raise RuntimeError("수집 실패 — 한 건도 못 받았습니다: " + repr(failed[:3]))

    frame = pd.concat(rows, ignore_index=True)
    if old is not None and not old.empty:
        frame = pd.concat([old, frame], ignore_index=True)
    # 같은 달은 한 행만 남긴다(그 달의 가장 최근 스냅샷).
    # 진행 중인 달은 '월말' 이 실행할 때마다 바뀌어서(9/18 → 9/21 …) 날짜 기준으로만
    # 중복을 제거하면 9월 행이 매 실행마다 새로 쌓인다. 그러면 월별 수익률 계열에 같은
    # 달이 두 번 들어가 누적수익·회귀가 조용히 어긋난다(실제로 그랬다).
    frame = frame.sort_values(["date", "market", "code"])
    frame["_ym"] = frame["date"].dt.to_period("M")
    frame = frame.drop_duplicates(["_ym", "code"], keep="last")
    # 종목마다 마지막 수집일이 다를 수 있어(9/18 에만 있던 종목, 9/21 에 새로 들어온 종목)
    # 달 안의 날짜를 그 달의 최신 하루로 통일한다. 안 그러면 한 달이 두 개의 날짜로 쪼개져
    # 피벗할 때 같은 달이 두 행이 된다.
    frame["date"] = frame.groupby("_ym")["date"].transform("max")
    frame = frame.drop(columns="_ym").reset_index(drop=True)
    frame.to_parquet(PANEL, index=False)

    print(f"저장: {PANEL}  ({len(frame):,}행, {frame['date'].nunique()}개 월말, "
          f"{frame['date'].min():%Y-%m} ~ {frame['date'].max():%Y-%m})")
    if failed:
        print(f"  [warn] 실패 {len(failed)}건:", failed[:5])
    return PANEL


def main() -> int:
    p = argparse.ArgumentParser(description="월말 KRX 패널 수집 (pykrx)")
    p.add_argument("--years", type=int, default=10)
    p.add_argument("--full", action="store_true")
    p.add_argument("--sleep", type=float, default=0.3)
    a = p.parse_args()
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    run(a.years, a.full, a.sleep)
    return 0


if __name__ == "__main__":
    sys.exit(main())
