# -*- coding: utf-8 -*-
"""이디오신크래틱 리턴 — 팩터로 설명되지 않는 종목 고유수익률.

각 종목의 월수익률을 시장 + 팩터 롱숏 스프레드에 회귀한다.

    r_t = α + β_mkt·MKT_t + Σ β_k·SPREAD_k,t + ε_t

    · 팩터 설명분 = β_mkt·MKT_t + Σ β_k·SPREAD_k,t   (시장·스타일로 설명되는 부분)
    · 이디오      = α + ε_t                          (그 종목에만 있는 부분)

산출:
    idio_cagr  이디오 부분만 복리로 쌓아 연율화 — "팩터를 다 걷어내고 이 종목이 낸 수익"
    idio_vol   잔차 연율 변동성 — 분산투자로 줄일 수 있는 위험
    idio_share 전체 변동성 중 이디오가 차지하는 비중 (= 1 − R²)
    beta_mkt   시장 베타
    r2         팩터 모형 설명력

설명변수로 롱온리 팩터가 아니라 **롱숏 스프레드**를 쓴다. 롱온리는 시장과 상관이 0.75~0.92
라 시장 베타와 뒤엉켜 고유분이 제대로 분리되지 않는다([factors.factor_spreads] 참고).

주의: 무위험수익률을 빼지 않은 총수익 기준이다(국내 단기금리 시계열을 이 파이프라인이
아직 안 갖고 있다). 그래서 α 는 엄밀한 젠센 알파가 아니라 '모형 대비 초과분' 으로 읽어야 한다.
상대 비교(종목 간 순위)에는 영향이 없다.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from quant_lab import factors as F

MIN_MONTHS = 36        # 회귀에 최소 3년치. 설명변수 7개라 이보다 짧으면 과적합.


def build_design(panel: pd.DataFrame) -> pd.DataFrame:
    """설명변수 행렬 (date × [MKT, 팩터 스프레드…])."""
    mkt = F.equal_weight_returns(panel).rename("MKT")
    spreads = F.factor_spreads(panel)
    return spreads.join(mkt, how="inner").dropna()


def compute(panel: pd.DataFrame, min_months: int = MIN_MONTHS) -> pd.DataFrame:
    """종목별 이디오 지표."""
    design = build_design(panel)

    close = panel.pivot_table(index="date", columns="code", values="close", aggfunc="last")
    mcap = panel.pivot_table(index="date", columns="code", values="mcap", aggfunc="last")
    ret = F.adjusted_monthly_returns(close, mcap)
    ret.index = ret.index.to_period("M").to_timestamp("M")

    idx = ret.index.intersection(design.index)
    ret, design = ret.loc[idx], design.loc[idx]

    cols = list(design.columns)
    X_all = np.column_stack([np.ones(len(design)), design.to_numpy(dtype=float)])
    k = X_all.shape[1]

    rows = []
    for code in ret.columns:
        y_all = ret[code].to_numpy(dtype=float)
        ok = np.isfinite(y_all)
        n = int(ok.sum())
        if n < min_months:
            continue
        X, y = X_all[ok], y_all[ok]
        # 설명변수가 상수뿐이 되는 퇴화 구간 방지
        if np.linalg.matrix_rank(X) < k:
            continue

        coef, *_ = np.linalg.lstsq(X, y, rcond=None)
        fitted = X @ coef
        resid = y - fitted
        alpha = coef[0]

        # 이디오 성분 = α + ε. 복리로 쌓아 연율화한다.
        idio_t = alpha + resid
        growth = float(np.prod(1.0 + idio_t))
        idio_cagr = growth ** (12.0 / n) - 1.0 if growth > 0 else float("nan")

        var_y = float(np.var(y, ddof=1))
        var_e = float(np.var(resid, ddof=1))
        r2 = 1.0 - var_e / var_y if var_y > 0 else float("nan")

        rows.append({
            "code": str(code),
            "idio_cagr": idio_cagr,
            "idio_vol": float(np.std(resid, ddof=min(k, n - 1)) * np.sqrt(12)),
            "idio_share": float(var_e / var_y) if var_y > 0 else None,
            "beta_mkt": float(coef[1 + cols.index("MKT")]),
            "r2": r2,
            "idio_months": n,
        })

    return pd.DataFrame(rows)
