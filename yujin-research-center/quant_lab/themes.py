# -*- coding: utf-8 -*-
"""Theme Master → '전략 만들기' 탭의 테마 구성종목.

원천은 `theme_rotation_report/weekly-theme-report` 의 **Theme Master** — Finup / AlphaSquare /
FnGuide / Naver / ETF 다섯 소스의 테마-종목 매핑을 표준화해 교차검증한 결과다.
각 행에 `source_count`(몇 개 소스가 이 연결을 지지하는가)와 `exposure_level`
(Core / Related / Peripheral)이 붙어 있어, 여기서 'Core' 만 추리면 테마와 실제로 관련 있는
종목만 남는다.

왜 이걸 쓰나: Supabase `theme_constituents` 는 주간 리포트가 거래대금 상위로 뽑은 것이라
테마 정의와 느슨하게 연결돼 있다. 시총 상위로 자르면 '수소'에 SK하이닉스, '양자컴퓨팅'에
무림P&P 같은 구성이 나온다. Theme Master 는 그 연결 강도를 직접 들고 있다.

선정 규칙: exposure_level=='Core' → 출처 합의(source_count) 내림차순 → 동률이면 시총 큰 순
           → 테마당 상위 TOP_N. '미분류' 버킷과 KRX 패널에 없는 종목은 제외한다.
"""
from __future__ import annotations

import glob
import os
import re
from pathlib import Path

import pandas as pd

# theme_rotation_report 는 폴더명이 바뀐 적이 있어(주간 테마 로테이션 자료 작성 → theme_rotation_report)
# 후보를 순회한다. db_loader/config.py 와 같은 이유.
_MASTER_CANDIDATES = [
    r"C:\Users\anjs9\OneDrive\바탕 화면\eugene_research\theme_rotation_report\weekly-theme-report\data\processed\master",
    r"C:\Users\anjs9\OneDrive\바탕 화면\eugene_research\주간 테마 로테이션 자료 작성\weekly-theme-report\data\processed\master",
]

# 테마당 보유 종목 수. Core 는 테마당 중앙값 24종목이라 자를 수밖에 없는데, 너무 적게 잡으면
# (처음엔 4였다) 테마 포트폴리오가 아니라 대표주 몇 개 나열처럼 보인다. 10 이면 38개 테마 중
# 30개가 꽉 차고, 화면 슬라이더도 스크롤 없이 들어간다.
TOP_N = 10
EXCLUDE_THEMES = {"미분류"}


def master_path() -> str | None:
    """가장 최신 theme_master_normalized_<날짜>.csv."""
    for base in _MASTER_CANDIDATES:
        if not os.path.isdir(base):
            continue
        files = glob.glob(os.path.join(base, "theme_master_normalized_*.csv"))
        files = [f for f in files if re.search(r"\d{4}-\d{2}-\d{2}\.csv$", f)]
        if files:
            return max(files)
    return None


def build(panel: pd.DataFrame, top_n: int = TOP_N) -> pd.DataFrame:
    """Theme Master + 월말 패널 시총 → 테마별 대표 종목 표."""
    path = master_path()
    if not path:
        raise FileNotFoundError("theme_master_normalized_*.csv 를 찾지 못했습니다: "
                                + " | ".join(_MASTER_CANDIDATES))

    master = pd.read_csv(path, dtype={"stock_code": str})
    last = panel[panel["date"] == panel["date"].max()].set_index("code")["mcap"]

    # Theme Master 의 코드는 'A005930' 처럼 접두어가 붙기도 한다 — 6자리로 통일.
    master["code"] = master["stock_code"].str.replace(r"^A", "", regex=True).str.zfill(6)
    master["mcap"] = master["code"].map(last)

    core = master[(master["exposure_level"] == "Core")
                  & master["mcap"].notna()
                  & (~master["sub_theme_name_kr"].isin(EXCLUDE_THEMES))].copy()

    picked = (core.sort_values(["source_count", "mcap"], ascending=[False, False])
                  .groupby("sub_theme_name_kr", sort=False)
                  .head(top_n)
                  .copy())
    picked["rank"] = picked.groupby("sub_theme_name_kr").cumcount() + 1

    out = picked.rename(columns={"sub_theme_name_kr": "theme_name", "stock_name": "stock_name"})
    out = out[["theme_name", "code", "stock_name", "source_count", "rank", "mcap"]]
    out["mcap_bil"] = out["mcap"] / 1e9
    out = out.drop(columns=["mcap"])
    # 종목이 2개 이하로 남은 테마는 포트폴리오로 의미가 없다.
    keep = out.groupby("theme_name")["code"].transform("size") >= 3
    return out[keep].reset_index(drop=True), Path(path).name
