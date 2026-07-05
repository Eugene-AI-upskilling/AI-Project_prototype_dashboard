# -*- coding: utf-8 -*-
"""주간 테마 metrics → themes 레코드 (버블/로테이션 모니터).

source: theme_weekly_metrics_<date>.xlsx
  - sheet 'league_table'  : ret_1m_pct, top5_value_traded_bn(자금집중도), theme_name_kr
  - sheet 'lifecycle'     : stage(국면), x_momentum/y_catalyst_flow(버블 좌표)
  - sheet 'long_signal'   : 다중테마 노출 Top
  - sheet 'short_signal'  : 공매도 잔고 급증
"""
import os
import pandas as pd
from . import config, transform as T


def extract(date=None):
    path = config.weekly_metrics_path(date)
    if not path or not os.path.exists(path):
        return {"themes": [], "long_signal": [], "short_signal": [], "_source": None}
    week = config.date_from_path(path)
    xl = pd.ExcelFile(path)

    league = xl.parse("league_table")
    life = xl.parse("lifecycle")[["theme_id", "stage", "x_momentum", "y_catalyst_flow"]]
    df = league.merge(life, on="theme_id", how="left")

    # 버블 크기: 거래대금(top5_value_traded_bn)을 2~10 범위로 정규화
    sizes = T.scale_minmax(list(df["top5_value_traded_bn"]), 2.0, 10.0)

    themes = []
    for (_, r), size in zip(df.iterrows(), sizes):
        xm = T.clean(r.get("x_momentum"))
        yc = T.clean(r.get("y_catalyst_flow"))
        themes.append({
            "name": r["theme_name_kr"],
            "concentration": round(size, 2) if size is not None else None,   # 버블 크기용 정규화값
            "ret_1m": round(float(r["ret_1m_pct"]), 2) if pd.notna(r["ret_1m_pct"]) else None,
            "state": T.clean(r.get("stage")),
            # 좌표(0~100) → 화면 % (8~92로 여백)
            "pos_x": round(8 + 0.84 * float(xm), 1) if xm is not None else None,
            "pos_y": round(8 + 0.84 * (100 - float(yc)), 1) if yc is not None else None,
            "week_of": week,
        })

    # 롱/숏 시그널 (홈페이지 Long/Short 카드용 — 별도 표시)
    long_sig, short_sig = [], []
    if "long_signal" in xl.sheet_names:
        for _, r in xl.parse("long_signal").iterrows():
            long_sig.append({
                "name": r.get("종목"), "themes": r.get("핵심테마"),
                "n_themes": int(r["테마수"]) if pd.notna(r.get("테마수")) else None,
                "ret_1w": T.pct_sign(T.clean(r.get("1W_pct")), 1),
            })
    if "short_signal" in xl.sheet_names:
        for _, r in xl.parse("short_signal").iterrows():
            short_sig.append({
                "name": r.get("종목"), "themes": r.get("테마"),
                "balance_change": f"+{r['잔고변화_pp']:.2f}%p" if pd.notna(r.get("잔고변화_pp")) else None,
                "ret_1w": T.pct_sign(T.clean(r.get("1W_pct")), 1),
            })

    return {"themes": themes, "long_signal": long_sig, "short_signal": short_sig, "_source": path}


if __name__ == "__main__":
    import json, sys, io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    print(json.dumps(extract(), ensure_ascii=False, indent=2, default=str))
