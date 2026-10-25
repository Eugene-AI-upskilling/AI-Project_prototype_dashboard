# -*- coding: utf-8 -*-
"""퀀트 스튜디오 배치 — 팩터 수익률 적재 + 대표 전략 티어시트 생성/업로드.

  1) ingest_krx_panel  월말 KRX 패널(pykrx) 증분 수집
  2) factors           팩터 6종 월별 수익률 + 코스피 벤치마크 산출
  3) push              quant_factor_returns / quant_factor_meta 적재
  4) tearsheets        tossquant 로 대표 전략 12종 리포트 생성 → Storage 업로드 → 인덱싱

티어시트를 12종만 만드는 이유: 사이트가 Netlify 정적 호스팅이라 브라우저에서 파이썬을
돌릴 수 없다. 팩터 조합 63가지를 전부 만들면 용량·시간이 커져서, 단일 팩터 6 + 추천
템플릿 6만 미리 만들고 나머지 조합은 화면에서 안내한다. 차트/지표 자체는 월별 수익률을
브라우저가 결합해 계산하므로 **어떤 조합이든 실제 숫자**가 나온다.

CLI:
  python -m quant_lab.run_quant_lab                    # 전체
  python -m quant_lab.run_quant_lab --skip-ingest
  python -m quant_lab.run_quant_lab --only-push        # 티어시트 생략
"""
from __future__ import annotations

import argparse
import io
import json
import os
import sys
import time
import datetime as _dt
from datetime import date
from pathlib import Path

import pandas as pd
import requests

BASE = Path(__file__).resolve().parent
DATA = BASE / "data"
OUT = BASE / "output"

sys.path.insert(0, str(BASE.parent))
from quant_lab import factors as F                      # noqa: E402
from quant_lab.ingest_krx_panel import PANEL, run as ingest_run   # noqa: E402

try:
    from dotenv import load_dotenv
    load_dotenv(BASE.parent / "db_loader" / ".env")
except ImportError:
    pass

URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
BUCKET = "tearsheets"

# 단일 팩터 6 + quant.html 의 추천 전략 템플릿 6 = 대표 전략 12.
TEMPLATES = [
    ("AI 슈퍼사이클",    ["mom", "qual"]),
    ("월급처럼 배당",     ["div", "lowvol"]),
    ("가치+퀄리티 코어",  ["value", "qual"]),
    ("K-방산 모멘텀",    ["mom", "size"]),
    ("낙폭과대 반등",     ["value", "mom"]),
    ("안정 인컴",        ["div", "qual", "lowvol"]),
]
DEFAULT_YEARS = 10
DEFAULT_COST = 0.3
DEFAULT_TURNOVER = 2.0        # 분기 리밸런싱 기준 연 회전 배수
MONTHS_PER_YEAR = 12          # 이 파이프라인의 수익률은 월별이다


def _headers(extra=None):
    h = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
    if extra:
        h.update(extra)
    return h


def _check():
    if not URL or not KEY:
        raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 미설정 (db_loader/.env)")


def kospi_monthly() -> pd.Series:
    """코스피 월말 종가 → 월 수익률."""
    from pykrx import stock
    today = date.today()
    start = date(today.year - DEFAULT_YEARS - 1, 1, 1)
    frame = stock.get_index_ohlcv(start.strftime("%Y%m%d"), today.strftime("%Y%m%d"), "1001")
    col = next(c for c in frame.columns if "종가" in str(c))
    close = frame[col].dropna()
    close = close[close > 0]
    monthly = close.resample("ME").last()
    # 이름을 안 주면 티어시트 헤더에 pykrx 컬럼명인 '종가' 가 벤치마크 이름으로 찍힌다.
    return monthly.pct_change().dropna().rename("코스피")


def _records(frame: pd.DataFrame) -> list[dict]:
    """DataFrame → JSON 안전한 dict 목록.

    `frame.where(pd.notna(frame), None)` 은 float 컬럼에서 None 이 다시 NaN 으로 되돌아간다
    (pandas 가 dtype 을 유지하려 하기 때문). NaN 은 JSON 표준이 아니라 PostgREST 가 400 을
    돌려준다. object 로 바꾼 뒤 치환해야 실제로 null 이 된다.
    """
    return frame.astype(object).where(pd.notna(frame), None).to_dict("records")


def upsert(table: str, rows: list[dict], on_conflict: str, chunk: int = 2000) -> int:
    _check()
    total = 0
    for i in range(0, len(rows), chunk):
        part = rows[i:i + chunk]
        res = requests.post(
            f"{URL}/rest/v1/{table}?on_conflict={on_conflict}",
            headers=_headers({"Content-Type": "application/json",
                              "Prefer": "resolution=merge-duplicates,return=minimal"}),
            data=json.dumps(part, default=str), timeout=90)
        res.raise_for_status()
        total += len(part)
    return total


def sanitize_tearsheet(local: Path) -> None:
    """tossquant 템플릿의 죽은 훅을 걷어낸다.

    report.html 이 `<body onload="save()">` 로 시작하는데 정작 save() 정의가 없어서
    리포트를 열 때마다 'save is not defined' 가 뜬다(원본 QuantStats 에서 다운로드
    스크립트를 함께 들어내면서 남은 흔적). 화면 내려받기는 우리 모달 버튼이 하므로
    여기서 훅만 제거한다. 포크를 고치면 이 줄은 지워도 된다.
    """
    html = local.read_text(encoding="utf-8", errors="ignore")
    if 'onload="save()"' in html:
        local.write_text(html.replace(' onload="save()"', ""), encoding="utf-8")


def upload_tearsheet(local: Path, name: str) -> str:
    """Storage 업로드 후 공개 URL 반환. 같은 이름이면 덮어쓴다."""
    _check()
    sanitize_tearsheet(local)
    with open(local, "rb") as f:
        body = f.read()
    res = requests.post(
        f"{URL}/storage/v1/object/{BUCKET}/{name}",
        headers=_headers({"Content-Type": "text/html", "x-upsert": "true"}),
        data=body, timeout=120)
    if res.status_code >= 400:
        raise RuntimeError(f"업로드 실패 [{res.status_code}] {res.text[:200]}")
    return f"{URL}/storage/v1/object/public/{BUCKET}/{name}"


def build_returns() -> tuple[pd.DataFrame, pd.Series]:
    """팩터 월별 수익률(+유니버스 동일가중)과 코스피 벤치마크.

    EQUAL_WEIGHT 는 팩터를 하나도 고르지 않았을 때 쓰는 기준선이라 팩터와 같은 표에 담는다
    (화면에서 조합 계산 코드를 그대로 재사용할 수 있다).
    """
    panel = pd.read_parquet(PANEL)
    fac = F.factor_returns(panel)
    fac["EQUAL_WEIGHT"] = F.equal_weight_returns(panel)
    bm = kospi_monthly()
    bm.index = bm.index.to_period("M").to_timestamp("M")
    # 팩터와 벤치마크가 겹치는 구간으로 맞춘다.
    idx = fac.index.intersection(bm.index)
    return fac.loc[idx], bm.loc[idx]


def push_returns(fac: pd.DataFrame, bm: pd.Series) -> dict:
    meta = [{"factor_id": k, "name_ko": v["name"], "description": v["desc"],
             "rule": v.get("rule", "")} for k, v in F.FACTORS.items()]
    meta.append({"factor_id": "BENCHMARK", "name_ko": "코스피(벤치마크)",
                 "description": "KRX 코스피 지수 월 수익률", "rule": "pykrx index 1001"})
    meta.append({"factor_id": "EQUAL_WEIGHT", "name_ko": "동일가중 (팩터 없음)",
                 "description": "투자 가능 유니버스를 전 종목 동일비중으로 보유",
                 "rule": f"시총 상위 {F.UNIVERSE_N} + 거래대금 하한, 매월 리밸런싱"})
    n_meta = upsert("quant_factor_meta", meta, "factor_id")

    rows = []
    for key in fac.columns:
        s = fac[key].dropna()
        rows += [{"factor_id": key, "month": d.date().isoformat(), "ret": float(v)}
                 for d, v in s.items()]
    rows += [{"factor_id": "BENCHMARK", "month": d.date().isoformat(), "ret": float(v)}
             for d, v in bm.dropna().items()]
    n_ret = upsert("quant_factor_returns", rows, "factor_id,month")
    return {"meta": n_meta, "returns": n_ret}


def push_theme_constituents() -> int:
    """Theme Master → quant_theme_constituents (전략 만들기 탭의 테마 구성종목).

    upsert 만 하면 이번 선정에서 빠진 종목이 테이블에 영원히 남는다(테마 구성이 바뀌거나
    보유 종목 수를 줄였을 때). 그래서 적재 후 '이번 실행에 안 닿은 행'을 지운다.
    """
    from quant_lab import themes as T
    _check()
    started = _dt.datetime.now(_dt.timezone.utc).isoformat()

    panel = pd.read_parquet(PANEL)
    frame, src = T.build(panel)
    rows = _records(frame)
    for r in rows:
        r["updated_at"] = _dt.datetime.now(_dt.timezone.utc).isoformat()
    n = upsert("quant_theme_constituents", rows, "theme_name,code")

    # 타임스탬프의 '+00:00' 을 그대로 붙이면 쿼리스트링에서 '+' 가 공백으로 해석돼 400 이 난다.
    res = requests.delete(
        f"{URL}/rest/v1/quant_theme_constituents",
        params={"updated_at": f"lt.{started}"},
        headers=_headers({"Prefer": "return=minimal"}), timeout=60)
    res.raise_for_status()

    print(f"  원천: {src} · 테마 {frame['theme_name'].nunique()}개 / 종목 {n}건 (구행 정리 완료)")
    return n


def push_idio() -> int:
    """종목별 이디오신크래틱(고유) 수익률·위험 → quant_stock_stats.

    quant_stock_stats 는 code 가 PK 라 같은 행에 컬럼만 덧붙인다(merge-duplicates).
    """
    from quant_lab import idio as I
    panel = pd.read_parquet(PANEL)
    frame = I.compute(panel)
    n = upsert("quant_stock_stats", _records(frame), "code")
    med = frame[["idio_cagr", "idio_vol", "r2", "beta_mkt"]].median()
    print(f"  중앙값 — 이디오 {med.idio_cagr*100:.1f}% / 이디오변동성 {med.idio_vol*100:.1f}% "
          f"/ R² {med.r2:.2f} / 베타 {med.beta_mkt:.2f}")
    return n


def _ticker_names() -> dict:
    """종목코드 → 종목명. 시장당 1콜이면 끝난다(get_market_ticker_name 은 종목당 1콜)."""
    from pykrx import stock
    today = date.today().strftime("%Y%m%d")
    out = {}
    for market in ("KOSPI", "KOSDAQ"):
        try:
            frame = stock.get_market_price_change_by_ticker(today, today, market=market)
            out.update(frame["종목명"].to_dict())
        except Exception as e:
            print(f"  [warn] {market} 종목명 조회 실패: {e}")
    return out


# '전략 만들기' 탭의 큐레이션 테마에 들어가는 해외 종목. KRX 패널에 없어 yfinance 로 받는다.
US_TICKERS = {"NVDA": "엔비디아", "MSFT": "마이크로소프트", "AAPL": "애플"}


def push_us_stock_stats() -> int:
    """해외 종목 실측 지표 — 한국 종목과 같은 quant_stock_stats 스키마로 넣는다.

    코드 자리에 티커(NVDA 등)를 쓰므로 6자리 숫자 코드와 충돌하지 않는다.
    """
    import yfinance as yf
    years = DEFAULT_YEARS
    rows = []
    for tk, name in US_TICKERS.items():
        try:
            hist = yf.Ticker(tk).history(period=f"{years}y", interval="1mo", auto_adjust=True)
            close = hist["Close"].dropna()
            if len(close) < 24:
                print(f"  [warn] {tk}: 월봉 {len(close)}개 — 건너뜀")
                continue
            ret = close.pct_change().dropna()
            n = len(ret)
            growth = (1 + ret).cumprod()
            info = yf.Ticker(tk).info or {}
            rows.append({
                "code": tk, "name": name,
                "cagr": float(growth.iloc[-1] ** (12 / n) - 1),
                "vol": float(ret.std() * (12 ** 0.5)),
                # yfinance 는 dividendYield 를 이미 퍼센트로 준다(0.8 = 0.8%).
                # ×100 하면 마이크로소프트 배당이 80% 로 찍힌다.
                "div": float(info.get("dividendYield") or 0),
                "mdd": float((growth / growth.cummax() - 1).min()),
                "mcap_bil": float(info.get("marketCap") or 0) / 1e9,
                "months": int(n),
            })
        except Exception as e:
            print(f"  [warn] {tk} 조회 실패: {e}")
    return upsert("quant_stock_stats", rows, "code") if rows else 0


def push_stock_stats(min_months: int = 24) -> int:
    """종목별 CAGR·변동성·배당수익률 — '전략 만들기' 탭의 슬라이더 지표용.

    테마 구성종목(theme_constituents)은 주간 테마 파이프라인이 채우고, 여기서는 그 종목들이
    실제로 어떤 수익률·변동성·배당을 냈는지만 월말 패널에서 계산한다.
    """
    panel = pd.read_parquet(PANEL)
    close = panel.pivot_table(index="date", columns="code", values="close", aggfunc="last")
    mcap = panel.pivot_table(index="date", columns="code", values="mcap", aggfunc="last")
    # 액면분할 보정은 팩터와 같은 함수를 쓴다 — 여기만 원시 종가를 쓰면 화면의 종목
    # CAGR 이 백테스트와 어긋난다.
    ret = F.adjusted_monthly_returns(close, mcap)

    months = ret.notna().sum()
    growth = (1 + ret.fillna(0)).cumprod()
    cagr = growth.iloc[-1] ** (12 / months.where(months > 0)) - 1
    vol = ret.std() * (12 ** 0.5)
    # 실제 월별 경로에서 잰 최대낙폭 — '변동성 × 상수' 같은 어림값보다 훨씬 낫다.
    mdd = (growth / growth.cummax() - 1).min()

    tail = panel[panel["date"] == panel["date"].max()].set_index("code")
    names = _ticker_names()

    rows = []
    for code in close.columns:
        if months.get(code, 0) < min_months or not pd.notna(cagr.get(code)):
            continue
        rows.append({
            "code": str(code),
            "name": str(names.get(code, code)),
            "cagr": float(cagr[code]),
            "vol": float(vol[code]) if pd.notna(vol.get(code)) else None,
            "mdd": float(mdd[code]) if pd.notna(mdd.get(code)) else None,
            "div": float(tail["div"].get(code)) if code in tail.index and pd.notna(tail["div"].get(code)) else None,
            "mcap_bil": float(tail["mcap"].get(code)) / 1e9 if code in tail.index and pd.notna(tail["mcap"].get(code)) else None,
            "months": int(months[code]),
        })
    return upsert("quant_stock_stats", rows, "code")


def _use_korean_font():
    """차트의 한글이 두부(□)로 깨지지 않게 실제 설치된 한글 폰트를 고정한다.

    tossquant 은 import 시점에 font.family 를 ['Pretendard', ..., 'Arial'] 리스트로 잡는데,
    이 PC 의 matplotlib 폰트 목록에 Pretendard 가 없으면 끝의 Arial 로 떨어진다(웹폰트라
    브라우저에만 있고 시스템에는 없다). Arial 에는 한글 글리프가 없어 범례의 '코스피' 가
    □□□ 로 나온다. 그래서 **tossquant 을 import 한 뒤** 실재하는 폰트 하나로 덮어쓴다.
    """
    import matplotlib
    from matplotlib import font_manager
    have = {f.name for f in font_manager.fontManager.ttflist}
    for name in ("Pretendard", "Malgun Gothic", "NanumGothic", "AppleGothic"):
        if name in have:
            matplotlib.rcParams["font.family"] = [name]
            matplotlib.rcParams["axes.unicode_minus"] = False   # 한글 폰트는 − 가 깨진다
            return name
    return None


def make_tearsheets(fac: pd.DataFrame, bm: pd.Series) -> list[dict]:
    import tossquant as tqs          # 폰트 rcParams 를 건드리므로 먼저 import 한다
    font = _use_korean_font()
    print(f"  차트 폰트: {font or '한글 폰트 없음 — 차트 한글이 깨질 수 있습니다'}")
    OUT.mkdir(parents=True, exist_ok=True)

    # 동일가중(팩터 미선택)도 화면에서 바로 상세 리포트를 열 수 있게 같이 만든다.
    jobs = ([("동일가중 (팩터 없음)", ["EQUAL_WEIGHT"])]
            + [(F.FACTORS[k]["name"], [k]) for k in F.FACTORS] + TEMPLATES)
    made = []
    for title, keys in jobs:
        key = "+".join(sorted(keys))
        series = F.combine(fac, keys, DEFAULT_COST, DEFAULT_TURNOVER).dropna()
        if series.empty or len(series) < 24:
            print(f"  [skip] {title}: 데이터 부족({len(series)}개월)")
            continue
        local = OUT / f"{key}.html"
        # periods_per_year 를 넘기지 않으면 기본값 252(일별)로 연환산해서 월별 계열의
        # CAGR·샤프가 몇 배로 부풀어 나온다(가치 팩터가 CAGR 694% 로 찍혔던 원인).
        tqs.reports.html(series, benchmark=bm.reindex(series.index).dropna(),
                         output=str(local), title=f"{title} · 최근 {DEFAULT_YEARS}년",
                         periods_per_year=MONTHS_PER_YEAR,
                         download_filename=f"{key}_tearsheet.html")
        url = upload_tearsheet(local, f"{key}.html")
        made.append({
            "key": key, "title": title, "factors": sorted(keys),
            "period_years": DEFAULT_YEARS, "url": url,
            "cagr": float(tqs.stats.cagr(series, periods=MONTHS_PER_YEAR)),
            "sharpe": float(tqs.stats.sharpe(series, periods=MONTHS_PER_YEAR)),
            "mdd": float(tqs.stats.max_drawdown(series)),
        })
        print(f"  [ok] {title:<18} {key:<22} CAGR {made[-1]['cagr']*100:6.2f}%  "
              f"Sharpe {made[-1]['sharpe']:.2f}  MDD {made[-1]['mdd']*100:6.1f}%")
    if made:
        upsert("quant_tearsheets", made, "key")
    return made


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    p = argparse.ArgumentParser(description="퀀트 스튜디오 배치")
    p.add_argument("--skip-ingest", action="store_true")
    p.add_argument("--only-push", action="store_true", help="티어시트 생성 생략")
    p.add_argument("--years", type=int, default=DEFAULT_YEARS)
    a = p.parse_args()

    t0 = time.time()
    if not a.skip_ingest:
        print("── 1) 월말 KRX 패널 수집 ──")
        ingest_run(a.years)

    print("── 2) 팩터 수익률 산출 ──")
    fac, bm = build_returns()
    print(f"  구간 {fac.index.min():%Y-%m} ~ {fac.index.max():%Y-%m} ({len(fac)}개월), "
          f"팩터 {list(fac.columns)}")
    for k in fac.columns:
        s = fac[k].dropna()
        cum = (1 + s).prod() - 1
        print(f"    {k:<7} {len(s):>3}개월  누적 {cum*100:8.1f}%")
    print(f"    {'KOSPI':<7} {len(bm):>3}개월  누적 {((1+bm).prod()-1)*100:8.1f}%")

    print("── 3) Supabase 적재 ──")
    print("  팩터:", push_returns(fac, bm))
    print("  종목통계:", push_stock_stats(), "건 (국내) +", push_us_stock_stats(), "건 (해외)")
    print("  이디오(고유수익률):", push_idio(), "건")
    print("  테마 구성종목:")
    push_theme_constituents()

    if not a.only_push:
        print("── 4) 대표 전략 티어시트 ──")
        made = make_tearsheets(fac, bm)
        print(f"  총 {len(made)}건 생성·업로드")

    print(f"완료 ({time.time() - t0:.0f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
