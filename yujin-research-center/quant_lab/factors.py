# -*- coding: utf-8 -*-
"""월말 KRX 패널 → 팩터 포트폴리오 월별 수익률.

quant.html 이 쓰던 팩터 6종을 그대로 실데이터로 계산한다. 각 팩터는 매 월말에
'그 시점에 알 수 있었던 값'으로 종목을 줄 세워 상위 K개를 동일비중 보유하고, 다음
월말까지의 수익률을 기록한다 — 룩어헤드가 없도록 점수는 t 시점, 수익률은 t→t+1 구간.

  value   저PER·저PBR       per, pbr 의 순위 평균 (낮을수록 좋음)
  mom     모멘텀            12−1개월 수익률 (직전 1개월 제외 — 단기 반전 회피)
  qual    퀄리티            ROE ≒ EPS/BPS (높을수록 좋음)
  lowvol  저변동성          과거 12개월 월수익률 표준편차 (낮을수록 좋음)
  div     배당              배당수익률 DIV (높을수록 좋음)
  size    소형주            시가총액 (작을수록 좋음)

유니버스: 월말 시가총액 상위 `UNIVERSE_N` 종목. 거래 불가능한 초소형주가 size/value
팩터를 지배해 백테스트만 화려해지는 걸 막는다(소형주 팩터는 이 안에서만 작게 간다).
"""
from __future__ import annotations

import numpy as np
import pandas as pd

UNIVERSE_N = 500      # 월말 시총 상위 N 종목만 투자 대상
TOP_K = 30            # 팩터별 보유 종목 수
MIN_VALUE = 1e8       # 월말 거래대금 하한(원) — 유동성 필터

FACTORS = {
    "value":  {"name": "가치 (Value)",        "desc": "저PER·저PBR"},
    "mom":    {"name": "모멘텀 (Momentum)",   "desc": "최근 추세 강세"},
    "qual":   {"name": "퀄리티 (Quality)",    "desc": "고ROE"},
    "lowvol": {"name": "저변동성",            "desc": "변동성 하위"},
    "div":    {"name": "배당 (Dividend)",     "desc": "고배당 우량주"},
    "size":   {"name": "소형주 (Size)",       "desc": "중소형 성장"},
}


SPLIT_LO, SPLIT_HI = 1 / 1.5, 1.5     # 주식수 변화가 이 밖이면 분할/병합으로 본다
RET_CLIP = 1.5                        # 월 ±150% 밖은 데이터 오류로 보고 버린다


def _wide(panel: pd.DataFrame, col: str) -> pd.DataFrame:
    """(date × code) 와이드 행렬."""
    return panel.pivot_table(index="date", columns="code", values=col, aggfunc="last")


def adjusted_monthly_returns(close: pd.DataFrame, mcap: pd.DataFrame) -> pd.DataFrame:
    """액면분할을 보정한 월 수익률.

    pykrx 가 주는 종가는 **수정주가가 아니다**. 5:1 액면분할이 나면 종가가 1/5 로 떨어져
    그 달 수익률이 -80% 로 찍히고, 저PER·소형주 팩터가 그런 종목을 자주 담기 때문에
    백테스트 결과가 통째로 망가진다.

    주식수 = 시가총액 / 종가 로 역산하면 분할은 '주식수가 배수로 튀는' 사건으로 잡힌다.
    주식수 변화가 1.5배 밖일 때만 그 비율로 종가를 보정한다 — 유상증자처럼 주식수가
    조금씩 느는 경우까지 보정하면 실제로 희석된 손실을 지워버리기 때문에 일부러 남긴다.
    """
    shares = (mcap / close.where(close > 0)).replace([np.inf, -np.inf], np.nan)
    ratio = shares / shares.shift(1)
    split = ratio.where((ratio < SPLIT_LO) | (ratio > SPLIT_HI), 1.0).fillna(1.0)

    ret = (close * split) / close.shift(1) - 1
    return ret.where(ret.abs() <= RET_CLIP)


def build_scores(panel: pd.DataFrame) -> dict[str, pd.DataFrame]:
    """팩터별 (date × code) 점수 — 클수록 매력적으로 부호를 통일한다."""
    close = _wide(panel, "close")
    mcap = _wide(panel, "mcap")
    value = _wide(panel, "value")
    per = _wide(panel, "per")
    pbr = _wide(panel, "pbr")
    eps = _wide(panel, "eps")
    bps = _wide(panel, "bps")
    div = _wide(panel, "div")

    monthly_ret = adjusted_monthly_returns(close, mcap)

    # PER/PBR 은 적자·자본잠식에서 0 이나 음수로 나온다 — 저PER 로 오인되지 않게 제외.
    per_pos = per.where(per > 0)
    pbr_pos = pbr.where(pbr > 0)
    value_score = -(per_pos.rank(axis=1, pct=True) + pbr_pos.rank(axis=1, pct=True)) / 2

    # 12−1 모멘텀: 12개월 전 대비 1개월 전까지의 상승률. 분할 보정된 수익률을 누적해 쓴다
    # (원시 종가로 계산하면 분할 종목이 전부 '급락주'로 잡힌다).
    cum = (1 + monthly_ret.fillna(0)).cumprod()
    mom_score = (cum.shift(1) / cum.shift(12) - 1).where(monthly_ret.shift(1).notna())

    roe = (eps / bps.where(bps > 0))

    lowvol_score = -monthly_ret.rolling(12, min_periods=6).std()

    scores = {
        "value": value_score,
        "mom": mom_score,
        "qual": roe,
        "lowvol": lowvol_score,
        "div": div.where(div > 0),
        "size": -mcap,
    }

    # 유니버스 마스크: 시총 상위 N + 거래대금 하한.
    investable = mcap.rank(axis=1, ascending=False) <= UNIVERSE_N
    investable &= value.fillna(0) >= MIN_VALUE
    return {k: v.where(investable) for k, v in scores.items()}, monthly_ret, investable


def equal_weight_returns(panel: pd.DataFrame) -> pd.Series:
    """유니버스 동일가중 월 수익률 — 팩터를 하나도 안 골랐을 때의 기준선.

    같은 투자 가능 유니버스(시총 상위 N + 거래대금 하한)를 전 종목 동일비중으로 들고
    매달 리밸런싱한 결과다. 시총가중인 코스피와 달리 종목 선택도 크기 편향도 없어서,
    '팩터가 실제로 보탠 게 얼마인가'를 재는 중립 기준이 된다.
    """
    _, monthly_ret, investable = build_scores(panel)
    nxt = monthly_ret.shift(-1)
    n = investable.sum(axis=1)
    ret = nxt.where(investable).mean(axis=1).where(n >= 30)
    ret.index = ret.index.to_period("M").to_timestamp("M")
    return ret.shift(1).dropna()


SPREAD_PCT = 0.3          # 상위/하위 30% 로 롱숏을 만든다


def factor_spreads(panel: pd.DataFrame, pct: float = SPREAD_PCT) -> pd.DataFrame:
    """팩터별 롱숏 스프레드 월수익률 (상위 pct − 하위 pct, 동일비중).

    화면에 쓰는 팩터 계열은 '상위 30종목 롱온리' 라 시장과 상관이 0.75~0.92 다. 그대로
    회귀 설명변수로 쓰면 시장 베타와 뒤엉켜 고유수익률이 제대로 분리되지 않는다.
    같은 점수로 롱숏을 만들면 시장 방향이 상쇄돼 '그 팩터에만 있는 수익' 이 남는다.
    """
    scores, monthly_ret, investable = build_scores(panel)
    nxt = monthly_ret.shift(-1)
    out = {}
    for key, score in scores.items():
        rank = score.rank(axis=1, pct=True)
        n = score.notna().sum(axis=1)
        long_ = nxt.where(rank >= 1 - pct).mean(axis=1)
        short = nxt.where(rank <= pct).mean(axis=1)
        out[key] = (long_ - short).where(n >= 50)
    frame = pd.DataFrame(out)
    frame.index = frame.index.to_period("M").to_timestamp("M")
    return frame.shift(1).dropna(how="all")


def factor_returns(panel: pd.DataFrame, top_k: int = TOP_K) -> pd.DataFrame:
    """팩터별 월별 수익률 (date × factor). date 는 '그 달에 실현된' 수익률."""
    scores, monthly_ret, _ = build_scores(panel)
    out = {}
    for key, score in scores.items():
        # t 시점 점수로 고른 종목의 t→t+1 수익률 = monthly_ret 을 한 칸 당긴 것.
        nxt = monthly_ret.shift(-1)
        picks = score.rank(axis=1, ascending=False) <= top_k
        n = picks.sum(axis=1)
        ret = (nxt.where(picks)).mean(axis=1)
        out[key] = ret.where(n >= top_k * 0.5)      # 종목이 너무 적은 달은 버린다
    frame = pd.DataFrame(out)
    # shift(-1) 로 당긴 값을 제 날짜(실현 월)로 되돌린다.
    frame.index = frame.index.to_period("M").to_timestamp("M")
    frame = frame.shift(1).dropna(how="all")
    return frame


def benchmark_returns(index_csv: pd.Series) -> pd.Series:
    """KOSPI 월별 수익률."""
    return index_csv.pct_change().dropna()


def combine(frame: pd.DataFrame, keys: list[str], cost_pct: float,
            turnover_per_year: float) -> pd.Series:
    """선택한 팩터를 동일비중 결합하고 거래비용을 뺀 월별 순수익률.

    거래비용은 '연간 회전율 × 편도 비용' 을 월 단위로 나눠 차감한다 — 화면의
    리밸런싱 주기/비용 선택을 그대로 반영하기 위한 단순 모형이다.
    """
    use = [k for k in keys if k in frame.columns]
    if not use:
        return pd.Series(dtype=float)
    gross = frame[use].mean(axis=1)
    monthly_drag = (cost_pct / 100.0) * turnover_per_year / 12.0
    return gross - monthly_drag
