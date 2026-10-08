# -*- coding: utf-8 -*-
"""해외 증시 페이지(global.html) 데이터 — 섹터 히트맵 · 20일 신고가/ATH 스크리너 · AI 딥리서치.

  global_sectors        S&P 500 11개 섹터 ETF + 테마 지수 1일/1주/1개월 등락
  global_highs          S&P 500 ∪ 나스닥 100 중 오늘 20일 신고가(종가 기준) 종목, ATH 여부 포함
  global_deep_research  신고가 상위 종목 AI 분석 (yfinance 펀더멘털·뉴스 → OpenAI 요약)

사용법 (yujin-research-center 폴더에서):
  python -m db_loader.global_markets            # 계산 + 검수 출력 (적재 안 함)
  python -m db_loader.global_markets --push     # Supabase 적재 (+ global_indices · global_quotes 함께 갱신)
  python -m db_loader.global_markets --push --no-ai   # LLM 없이 데이터 요약만

기준: 종가(분할 반영, 배당 미반영 Close). ATH = 상장 이후 전체 종가 최고치 돌파.
"""
import datetime as _dt
import io
import json
import math
import os
import re
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

import pandas as pd
import requests

CACHE_DIR = os.path.join(os.path.dirname(__file__), "_cache")
UA = {"User-Agent": "Mozilla/5.0 (EugeneInsightLab data loader)"}

SECTOR_ETFS = [
    ("XLK", "기술"), ("XLC", "커뮤니케이션"), ("XLY", "경기소비재"), ("XLI", "산업재"),
    ("XLF", "금융"), ("XLB", "소재"), ("XLV", "헬스케어"), ("XLRE", "부동산"),
    ("XLP", "필수소비재"), ("XLE", "에너지"), ("XLU", "유틸리티"),
]
# (표시 심볼, 표시명, yfinance 티커)
THEMES = [
    ("SOX", "필라델피아 반도체", "^SOX"), ("NDX", "나스닥 100", "^NDX"),
    ("IGV", "소프트웨어", "IGV"), ("GRID", "전력 인프라", "GRID"), ("URA", "우라늄·원전", "URA"),
    ("ITA", "방산·항공우주", "ITA"), ("BOTZ", "로봇·AI", "BOTZ"), ("XBI", "바이오", "XBI"),
]
GICS_KO = {
    "Information Technology": "기술", "Communication Services": "커뮤니케이션",
    "Consumer Discretionary": "경기소비재", "Industrials": "산업재", "Financials": "금융",
    "Materials": "소재", "Health Care": "헬스케어", "Real Estate": "부동산",
    "Consumer Staples": "필수소비재", "Energy": "에너지", "Utilities": "유틸리티",
}
ICB_KO = {
    "Technology": "기술", "Telecommunications": "커뮤니케이션", "Consumer Discretionary": "경기소비재",
    "Industrials": "산업재", "Financials": "금융", "Basic Materials": "소재", "Health Care": "헬스케어",
    "Real Estate": "부동산", "Consumer Staples": "필수소비재", "Energy": "에너지", "Utilities": "유틸리티",
}
TURN_THRESHOLD = -15.0      # 프론트(global.html)와 동일: 52주 고가 대비 -15% 이하에서 20일 신고가 → 전환 후보
DR_MAX = int(os.environ.get("GLOBAL_DR_MAX", "12"))
DR_MODEL = os.environ.get("GLOBAL_DR_MODEL", "gpt-4o-mini")


def _r(v, n=2):
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(f) or math.isinf(f) else round(f, n)


# ───────────────────────── 유니버스 ─────────────────────────
def universe():
    """[{ticker(yf), name, sector}] — S&P 500 ∪ 나스닥 100. 실패 시 7일 캐시 사용."""
    os.makedirs(CACHE_DIR, exist_ok=True)
    cache = os.path.join(CACHE_DIR, "us_universe.json")
    if os.path.exists(cache) and (_dt.datetime.now().timestamp() - os.path.getmtime(cache)) < 7 * 86400:
        with open(cache, encoding="utf-8") as f:
            return json.load(f)
    out = {}
    try:
        html = requests.get("https://en.wikipedia.org/wiki/List_of_S%26P_500_companies", headers=UA, timeout=30).text
        sp = pd.read_html(io.StringIO(html))[0]
        for _, r in sp.iterrows():
            tk = str(r["Symbol"]).strip().replace(".", "-")
            out[tk] = {"ticker": tk, "name": str(r["Security"]).strip(),
                       "sector": GICS_KO.get(str(r["GICS Sector"]).strip(), str(r["GICS Sector"]).strip())}
        html = requests.get("https://en.wikipedia.org/wiki/List_of_NASDAQ-100_companies", headers=UA, timeout=30).text
        nd = next(t for t in pd.read_html(io.StringIO(html)) if "Ticker" in t.columns and len(t) > 90)
        ind_col = next(c for c in nd.columns if str(c).startswith("ICB Industry"))
        for _, r in nd.iterrows():
            tk = str(r["Ticker"]).strip().replace(".", "-")
            if tk not in out:
                out[tk] = {"ticker": tk, "name": str(r["Company"]).strip(),
                           "sector": ICB_KO.get(str(r[ind_col]).strip(), str(r[ind_col]).strip())}
    except Exception as e:
        print(f"⚠ 유니버스 수집 실패({e}) — 캐시 사용 시도")
        if os.path.exists(cache):
            with open(cache, encoding="utf-8") as f:
                return json.load(f)
        return []
    rows = list(out.values())
    with open(cache, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False)
    return rows


def _drop_open_session(df):
    """미국 장중(뉴욕 16:20 이전)에 돌리면 오늘 미완성 봉이 '종가'처럼 섞인다 → 제거."""
    from zoneinfo import ZoneInfo
    ny = _dt.datetime.now(ZoneInfo("America/New_York"))
    if df is None or df.empty or ny.time() >= _dt.time(16, 20):
        return df
    idx = pd.to_datetime(df.index)
    return df[[d.date() < ny.date() for d in idx]]


# ───────────────────────── 섹터·테마 ─────────────────────────
def sectors():
    import yfinance as yf
    spec = [(s, n, "sector", s) for s, n in SECTOR_ETFS] + [(s, n, "theme", y) for s, n, y in THEMES]
    data = yf.download([y for *_, y in spec], period="3mo", auto_adjust=True, progress=False, threads=True)
    close = _drop_open_session(data["Close"])
    rows = []
    if close.dropna(how="all").empty:
        raise RuntimeError("섹터 ETF 가격 수집 실패")
    for sym, name, kind, y in spec:
        c = close[y].dropna() if y in close else pd.Series(dtype=float)
        if len(c) < 23:
            continue
        last = c.iloc[-1]
        pct = lambda k: _r((last / c.iloc[-1 - k] - 1) * 100)
        rows.append({"symbol": sym, "name": name, "kind": kind, "price": _r(last),
                     "chg_1d": pct(1), "chg_1w": pct(5), "chg_1m": pct(21),
                     "asof": c.index[-1].date().isoformat()})
    return rows


# ───────────────────────── 신고가 / ATH ─────────────────────────
def _download_max(tickers, chunk=120):
    """전체 기간 일봉 (Close·Volume). 청크로 나눠 실패 영향 축소."""
    import yfinance as yf
    closes, vols = [], []
    for i in range(0, len(tickers), chunk):
        part = tickers[i:i + chunk]
        try:
            d = yf.download(part, period="max", auto_adjust=False, progress=False, threads=True)
        except Exception as e:
            print(f"  ⚠ 다운로드 실패 {i}~{i + len(part)}: {e}")
            continue
        closes.append(d["Close"]); vols.append(d["Volume"])
        print(f"  가격 수집 {min(i + chunk, len(tickers))}/{len(tickers)}")
    return pd.concat(closes, axis=1), pd.concat(vols, axis=1)


def highs(univ):
    """오늘 20일 신고가(종가 > 직전 20거래일 종가 최고) 종목 목록 + ATH/52주/거래량 지표."""
    meta = {u["ticker"]: u for u in univ}
    close, vol = _download_max(list(meta))
    close, vol = _drop_open_session(close), _drop_open_session(vol)
    asof = close.dropna(how="all").index[-1]
    covered = int(close.loc[asof].notna().sum())
    if covered < len(meta) * 0.9:   # Yahoo 일부 장애 → 일부 종목만으로 계산하면 신고가 목록이 틀려짐
        raise RuntimeError(f"가격 수집 부족 {covered}/{len(meta)} — 적재 중단")
    rows = []
    for tk in close.columns:
        c = close[tk].dropna()
        if len(c) < 60 or c.index[-1] != asof:           # 상장 직후·거래정지 제외
            continue
        last, prior = c.iloc[-1], c.iloc[:-1]
        hi20 = prior.iloc[-20:].max()
        if not last > hi20:
            continue
        v = vol[tk].reindex(c.index).fillna(0)
        hi52 = prior.iloc[-251:].max()
        is_ath = bool(last > prior.max())
        # 최근 20거래일 중 ATH 갱신 일수
        run_max = c.cummax().shift(1)
        streak = int((c.iloc[-20:] > run_max.iloc[-20:]).sum())
        ma20 = c.iloc[-20:].mean()
        vavg = v.iloc[-21:-1].mean()
        rows.append({
            "ticker": tk, "name": meta[tk]["name"], "sector": meta[tk]["sector"],
            "close": _r(last), "chg_pct": _r((last / prior.iloc[-1] - 1) * 100),
            "vol_ratio": _r(v.iloc[-1] / vavg, 1) if vavg else None,
            "is_20d": True, "is_ath": is_ath,
            "from_52w_high": 0.0 if last >= hi52 else _r((last / hi52 - 1) * 100, 1),
            "ath_streak": streak if is_ath else None,
            "ma20_gap": _r((last / ma20 - 1) * 100, 1),
            "spark": [_r(x) for x in c.iloc[-60:].tolist()],
            "asof": asof.date().isoformat(), "next_earnings": None,
            "_hi52": _r(hi52), "_ma20": _r(ma20),          # '_' 키는 리서치용 — DB 적재 시 제외
        })
    return rows


def _next_earnings(tk):
    import time
    import yfinance as yf
    for attempt in range(3):          # Yahoo crumb 401 은 간헐적 → 재시도
        try:
            cal = yf.Ticker(tk).calendar or {}
            ds = cal.get("Earnings Date") or []
            today = _dt.date.today()
            fut = sorted(d for d in ds if isinstance(d, _dt.date) and d >= today)
            return fut[0].isoformat() if fut else None
        except Exception:
            time.sleep(1.5 * (attempt + 1))
    return None


def attach_earnings(rows):
    with ThreadPoolExecutor(4) as ex:
        for r, d in zip(rows, ex.map(lambda r: _next_earnings(r["ticker"]), rows)):
            r["next_earnings"] = d


# ───────────────────────── AI 딥리서치 ─────────────────────────
def pick_targets(rows, n=DR_MAX):
    """전환 후보(거래량 순) → ATH(연속 갱신 순) → 나머지 20일 신고가(거래량 순)에서 고르게 선정."""
    turn = sorted([r for r in rows if not r["is_ath"] and (r["from_52w_high"] or 0) <= TURN_THRESHOLD],
                  key=lambda r: -(r["vol_ratio"] or 0))
    ath = sorted([r for r in rows if r["is_ath"]], key=lambda r: (-(r["ath_streak"] or 0), -(r["vol_ratio"] or 0)))
    rest = sorted([r for r in rows if r not in turn and r not in ath], key=lambda r: -(r["vol_ratio"] or 0))
    out, pools = [], [turn, ath, rest]
    while len(out) < n and any(pools):
        for p in pools:
            if p and len(out) < n:
                out.append(p.pop(0))
    return out


_NAME_TAIL = re.compile(r"[,.]?\s+(Inc|Incorporated|Corp|Corporation|Co|Company|Ltd|Limited|plc|PLC|Holdings|Group|"
                        r"Class [A-C]|N\.V|S\.A|AG|SE|L\.P|Technologies|Technology)\b\.?", re.I)


def _short_name(name):
    """'ON Semiconductor Corp.' → 'ON Semiconductor' (검색·헤드라인 매칭용)."""
    out = name
    for _ in range(3):
        out = _NAME_TAIL.sub("", out).strip(" ,.")
    return out or name


def _news(ticker, name, n=8):
    """최근 7일 뉴스 헤드라인 — Google News RSS (yfinance .news 는 현재 빈 값을 반환).
    짧은 티커(ON, Q, P …)는 엉뚱한 기사가 섞이므로 회사명으로 검색하고, 헤드라인에
    회사명이나 티커가 들어간 기사만 남긴다."""
    import urllib.parse
    import xml.etree.ElementTree as ET
    from email.utils import parsedate_to_datetime
    short = _short_name(name)
    q = urllib.parse.quote(f'"{short}" stock when:7d')
    try:
        res = requests.get(f"https://news.google.com/rss/search?q={q}&hl=en-US&gl=US&ceid=US:en",
                           headers=UA, timeout=20)
        items = list(ET.fromstring(res.content).iter("item"))
    except Exception:
        return []
    key = short.split()[0].lower() if len(short.split()[0]) >= 4 else short.lower()
    tk_re = re.compile(rf"\b{re.escape(ticker)}\b") if len(ticker) >= 3 else None
    out = []
    for it in items:
        title = (it.findtext("title") or "").strip()
        src = it.findtext("source") or ""
        if src and title.endswith(" - " + src):
            title = title[: -len(src) - 3]
        if key not in title.lower() and not (tk_re and tk_re.search(title)):
            continue
        try:
            date = parsedate_to_datetime(it.findtext("pubDate")).date().isoformat()
        except Exception:
            date = ""
        out.append({"title": title, "publisher": src, "date": date, "url": it.findtext("link")})
        if len(out) >= n:
            break
    return out


def _facts(r):
    """LLM 입력용 사실 묶음 — 여기 없는 내용은 쓰지 말라고 지시한다."""
    import yfinance as yf
    t = yf.Ticker(r["ticker"])
    info = {}
    try:
        info = t.info or {}
    except Exception:
        pass
    news = _news(r["ticker"], r["name"])
    eps_rev = None
    try:
        et = t.eps_trend
        if et is not None and "0y" in et.index:
            cur, ago = et.loc["0y", "current"], et.loc["0y", "30daysAgo"]
            if ago:
                eps_rev = _r((cur / ago - 1) * 100, 1)
    except Exception:
        pass
    metrics = {
        "fpe": f"{info['forwardPE']:.1f}x" if _r(info.get("forwardPE")) else None,
        "rev_g": f"{info['revenueGrowth'] * 100:+.1f}%" if _r(info.get("revenueGrowth")) is not None else None,
        "eps_rev": (None if eps_rev is None else "변동 없음" if abs(eps_rev) < 0.05 else f"{eps_rev:+.1f}%"),
        "short": f"{info['shortPercentOfFloat'] * 100:.1f}%" if _r(info.get("shortPercentOfFloat")) is not None else None,
    }
    facts = {
        "ticker": r["ticker"], "name": r["name"], "sector": r["sector"],
        "price": r["close"], "change_today_pct": r["chg_pct"], "volume_vs_20d_avg": r["vol_ratio"],
        "is_all_time_high": r["is_ath"], "ath_days_in_last_20": r["ath_streak"],
        "pct_from_52w_high_before_today": r["from_52w_high"], "pct_above_20d_ma": r["ma20_gap"],
        "next_earnings": r["next_earnings"],
        "industry": info.get("industry"), "forward_pe": _r(info.get("forwardPE")),
        "trailing_pe": _r(info.get("trailingPE")), "revenue_growth_yoy": _r(info.get("revenueGrowth")),
        "earnings_growth_yoy": _r(info.get("earningsGrowth")), "profit_margin": _r(info.get("profitMargins")),
        "analyst_target_mean": _r(info.get("targetMeanPrice")), "analyst_rating": info.get("recommendationKey"),
        "eps_estimate_change_30d_pct": eps_rev, "short_pct_float": _r(info.get("shortPercentOfFloat")),
        "business": (info.get("longBusinessSummary") or "")[:600],
        "recent_news": news,
    }
    return facts, metrics, news


SYS_PROMPT = (
    "너는 증권사 해외주식 리서치 애널리스트다. 입력 JSON은 오늘 신고가를 기록한 미국 종목의 사실 데이터다. "
    "반드시 입력에 있는 사실과 숫자만 근거로 한국어로 분석하라. 입력에 없는 수치·사건·제품명을 지어내지 마라. "
    "뉴스가 없거나 상승 이유가 불분명하면 그렇다고 솔직히 쓰고 가격·수급 지표로 설명하라. 투자권유·과장·이모지 금지. "
    "ATH 종목은 '추세가 유지되는지'(연속 갱신, 20일선 이격 과열 여부)에, 52주 고가에서 멀리 떨어진 20일 신고가 종목은 "
    "'추세 전환의 근거'에 초점을 맞춰라. "
    "출력은 JSON 객체 하나: {\"thesis\": 2~3문장 요약, \"drivers\": 상승 배경 3개 문자열 배열(핵심 키워드는 <b></b>로 감싸기), "
    "\"risks\": 리스크 2개 배열, \"checkpoints\": 다음에 확인할 것 2개 배열(날짜·가격 레벨이 입력에 있으면 활용)}"
)


def _llm(facts):
    key = os.environ.get("OPENAI_API") or os.environ.get("OPENAI_API_KEY")
    if not key:
        return None
    body = {"model": DR_MODEL, "temperature": 0.3, "max_tokens": 900,
            "response_format": {"type": "json_object"},
            "messages": [{"role": "system", "content": SYS_PROMPT},
                         {"role": "user", "content": json.dumps(facts, ensure_ascii=False, default=str)}]}
    req = urllib.request.Request("https://api.openai.com/v1/chat/completions",
                                 data=json.dumps(body).encode("utf-8"),
                                 headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as res:
        out = json.loads(res.read().decode("utf-8"))
    return json.loads(out["choices"][0]["message"]["content"])


SECTOR_ETF_BY_KO = {n: s for s, n in SECTOR_ETFS}


def _dday(d):
    try:
        return (_dt.date.fromisoformat(d) - _dt.date.today()).days
    except Exception:
        return None


def rule_brief(r, facts, sec_map):
    """LLM 없이 사실 데이터만으로 만드는 리서치 요약 (model='rule').
    해석·전망은 넣지 않고, 수치가 말해주는 것만 문장으로 정리한다."""
    tk, vol, gap, f52 = r["ticker"], r["vol_ratio"], r["ma20_gap"], r["from_52w_high"]
    etf = sec_map.get(SECTOR_ETF_BY_KO.get(r["sector"]))
    sec_chg = etf.get("chg_1d") if etf else None
    news = facts.get("recent_news") or []
    tgt, price = facts.get("analyst_target_mean"), r["close"]
    dd = _dday(r["next_earnings"]) if r["next_earnings"] else None

    if r["is_ath"]:
        s1 = (f"{tk}는 {r['chg_pct']:+.2f}% 오르며 사상 최고가를 경신했고, 최근 20거래일 중 "
              f"{r['ath_streak']}일 신고가를 기록했습니다.")
        s2 = (f"20일선 대비 {gap:+.1f}% 위에 있어 " +
              ("단기 과열 구간입니다." if gap >= 10 else "추세는 과열 없이 유지되는 모습입니다."))
    else:
        s1 = f"{tk}는 {r['chg_pct']:+.2f}% 오르며 최근 20거래일 최고가를 돌파했습니다."
        s2 = (f"아직 52주 고가 대비 {f52:.1f}% 아래로, 하락 추세에서 벗어나는 초기 신호인지 확인이 필요한 구간입니다."
              if (f52 or 0) <= TURN_THRESHOLD else
              f"52주 고가까지 {abs(f52 or 0):.1f}% 남아 고점 돌파를 시도하는 위치입니다.")
    s3 = ((f"거래량은 20일 평균의 {vol:.1f}배로 " + ("돌파에 힘이 실렸습니다." if vol >= 1.5 else
           "평소 수준이라 돌파의 신뢰도는 추가 확인이 필요합니다.")) if vol else "")

    drivers = []
    if vol and vol >= 1.5:
        drivers.append(f"<b>거래량 {vol:.1f}배</b> 동반 — 평소보다 강한 매수 유입")
    if sec_chg is not None:
        drivers.append(f"<b>{r['sector']} 섹터</b>({etf['symbol']}) {sec_chg:+.2f}% — " +
                       ("섹터 흐름과 함께 상승" if sec_chg > 0 else "섹터 약세 속 종목 고유 재료 가능성"))
    e = facts.get("eps_estimate_change_30d_pct")
    if e is not None and abs(e) >= 0.5:
        drivers.append(f"<b>올해 EPS 추정치 30일간 {e:+.1f}%</b> " + ("상향" if e > 0 else "하향"))
    if facts.get("revenue_growth_yoy") is not None:
        drivers.append(f"최근 분기 <b>매출 성장률 {facts['revenue_growth_yoy'] * 100:+.1f}%</b> (전년 대비)")
    if news:
        drivers.append(f"최근 7일 관련 뉴스 <b>{len(news)}건</b> — 아래 헤드라인에서 상승 재료를 확인하세요")
    else:
        drivers.append("최근 7일 눈에 띄는 개별 뉴스는 없음 — 수급·섹터 요인 중심의 상승")

    risks = []
    if gap is not None and gap >= 10:
        risks.append(f"20일선 대비 <b>{gap:+.1f}%</b> 이격 — 단기 차익 매물 출회 가능성")
    if dd is not None and 0 <= dd <= 21:
        risks.append(f"<b>D-{dd} 실적 발표</b>({r['next_earnings']}) — 발표 전후 변동성 확대")
    if vol is not None and vol < 1:
        risks.append(f"거래량 {vol:.1f}배로 평균 이하 — 돌파 후 되밀림 위험")
    if not r["is_ath"] and r.get("_hi52"):
        risks.append(f"52주 고가 <b>${r['_hi52']:,}</b> 부근 매물대 부담")
    fpe = facts.get("forward_pe")
    if fpe and fpe >= 40:
        risks.append(f"선행 PER <b>{fpe:.1f}배</b>로 밸류에이션 부담")
    if not risks:
        risks.append("특이 리스크 신호는 없으나 시장 전반 조정 시 동반 하락 가능")

    checks = []
    if r.get("_ma20"):
        checks.append(f"20일선 <b>${r['_ma20']:,}</b> 지지 여부")
    if not r["is_ath"] and r.get("_hi52"):
        checks.append(f"52주 고가 <b>${r['_hi52']:,}</b> 돌파 시 추세 전환 확인" if (f52 or 0) <= TURN_THRESHOLD
                      else f"52주 고가 <b>${r['_hi52']:,}</b> 돌파 여부")
    if r["next_earnings"]:
        checks.append(f"<b>{r['next_earnings']}</b> 실적 발표에서 가이던스 방향")
    if tgt and price:
        checks.append(f"애널리스트 평균 목표가 <b>${tgt:,}</b> (현재가 대비 {(tgt / price - 1) * 100:+.1f}%)")

    return {"thesis": " ".join(x for x in (s1, s2, s3) if x),
            "drivers": drivers[:4], "risks": risks[:3], "checkpoints": checks[:3]}


def deep_research(rows, sec, use_llm=True):
    """신고가 전 종목에 리서치 요약 생성.
    - 기본: 사실 데이터 기반 요약(model='rule', 비용 없음)
    - LLM 사용 가능 시: pick_targets 상위 DR_MAX 종목은 AI 분석으로 대체(같은 날 재실행 시 캐시)."""
    os.makedirs(CACHE_DIR, exist_ok=True)
    cache_p = os.path.join(CACHE_DIR, "global_deep_research.json")
    try:
        with open(cache_p, encoding="utf-8") as f:
            cache = json.load(f)
    except Exception:
        cache = {}
    sec_map = {x["symbol"]: x for x in sec}
    llm_set = {t["ticker"] for t in pick_targets(list(rows))} if use_llm else set()
    llm_ok = use_llm and bool(os.environ.get("OPENAI_API") or os.environ.get("OPENAI_API_KEY"))

    def facts_of(r):
        try:
            return _facts(r)
        except Exception as e:
            print(f"  ⚠ 데이터 수집 실패 {r['ticker']}: {e}")
            return None
    with ThreadPoolExecutor(4) as ex:
        gathered = list(ex.map(facts_of, rows))

    out, n_ai = [], 0
    for r, g in zip(rows, gathered):
        if not g:
            continue
        facts, metrics, news = g
        ck = f"{r['ticker']}|{r['asof']}"
        body, model = None, "rule"
        if r["ticker"] in llm_set and ck in cache:
            body, model = cache[ck], cache[ck].get("model", DR_MODEL)
        elif r["ticker"] in llm_set and llm_ok:
            try:
                ai = _llm(facts)
                if ai and ai.get("thesis"):
                    body, model = ai, DR_MODEL
            except urllib.error.HTTPError as e:
                detail = e.read().decode("utf-8", "ignore")[:160]
                print(f"  ⚠ LLM 오류 {e.code}: {detail} → 이후 종목은 데이터 요약으로 대체")
                if e.code in (401, 402, 429):     # 키 오류·크레딧 소진 → 더 시도하지 않음
                    llm_ok = False
            except Exception as e:
                print(f"  ⚠ LLM 실패 {r['ticker']}: {e}")
        if body is None:
            body = rule_brief(r, facts, sec_map)
        row = {"ticker": r["ticker"], "asof": r["asof"], "thesis": body.get("thesis"),
               "drivers": body.get("drivers") or [], "risks": body.get("risks") or [],
               "checkpoints": body.get("checkpoints") or [], "metrics": metrics,
               "sources": [{"title": n["title"], "publisher": n["publisher"], "url": n["url"], "date": n["date"]}
                           for n in news[:5]],
               "model": model}
        if model != "rule":
            cache[ck] = row          # AI 결과만 캐시 (데이터 요약은 매번 새로 계산)
            n_ai += 1
        out.append(row)
    print(f"  리서치 요약 {len(out)}건 (AI {n_ai} · 데이터 요약 {len(out) - n_ai})")
    cut = (_dt.date.today() - _dt.timedelta(days=30)).isoformat()
    cache = {k: v for k, v in cache.items() if (v.get("asof") or "") >= cut}
    with open(cache_p, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False)
    return out


# ───────────────────────── 모닝 브리핑 ─────────────────────────
def overnight_brief(gi, sec, hi):
    """global_research(kind='overnight') 갱신용 — 지수·섹터·신고가 데이터로 만드는 밤사이 요약."""
    from collections import Counter
    ix = {x["symbol"]: x for x in gi or []}
    spx, ndx = ix.get("GSPC"), ix.get("IXIC")
    if not spx or not ndx or spx.get("change_pct") is None or ndx.get("change_pct") is None:
        return None
    sectors = sorted([x for x in sec if x["kind"] == "sector" and x.get("chg_1d") is not None],
                     key=lambda x: -x["chg_1d"])
    themes = sorted([x for x in sec if x["kind"] == "theme" and x.get("chg_1d") is not None],
                    key=lambda x: -x["chg_1d"])
    up = [x for x in sectors if x["chg_1d"] > 0]
    a, b = spx["change_pct"], ndx["change_pct"]
    mood = "동반 상승" if a > 0 and b > 0 else "동반 하락" if a < 0 and b < 0 else "혼조"
    lead = "·".join(x["name"] for x in sectors[:2]) if sectors else ""
    title = f"미 증시 {mood}, {lead} {'강세' if sectors and sectors[0]['chg_1d'] > 0 else '상대 우위'}"
    parts = [f"S&P 500 {a:+.2f}%, 나스닥 {b:+.2f}%."]
    if sectors:
        weak = [x for x in sectors if x["chg_1d"] < 0]
        parts.append(f"11개 섹터 중 {len(up)}개 상승" +
                     (f", {weak[-1]['name']}({weak[-1]['chg_1d']:+.2f}%)가 가장 약했습니다." if weak else "."))
    if hi:
        top = Counter(r["sector"] for r in hi).most_common(2)
        n_ath = sum(1 for r in hi if r["is_ath"])
        parts.append(f"20일 신고가 {len(hi)}종목(ATH {n_ath}) 중 " +
                     " · ".join(f"{s} {n}" for s, n in top) + "종목이 가장 많았습니다.")
    vix = ix.get("VIX")
    if vix and vix.get("price"):
        parts.append(f"VIX {vix['price']}.")
    rows = [{"name": "S&P 500", "chg": f"{a:+.2f}%"}, {"name": "나스닥", "chg": f"{b:+.2f}%"}]
    if themes:
        rows.append({"name": themes[0]["name"], "chg": f"{themes[0]['chg_1d']:+.2f}%"})
    return {"title": title, "badge": "데이터 요약",
            "body": {"note": " ".join(parts), "rows": rows, "asof": spx.get("as_of")}}


# ───────────────────────── 적재 ─────────────────────────
def push(sec, hi, dr):
    """테이블별로 독립 적재 — 하나가 실패(예: 테이블 미생성)해도 나머지는 진행."""
    from . import supabase_upsert as su, push_global_indices, extract_global
    gi = push_global_indices.fetch()
    hi_rows = [{k: v for k, v in r.items() if not k.startswith("_")} for r in hi]
    jobs = [
        ("global_indices", lambda: su.upsert("global_indices", gi, "symbol")),
        # output/global_earnings.xlsx (scripts/3_Global_Earnings.py 가 먼저 갱신)
        ("global_quotes", lambda: su.upsert("global_quotes", extract_global.extract()["global_quotes"], "ticker")),
        ("global_sectors", lambda: su.upsert("global_sectors", sec, "symbol")),
        # 오늘 신고가 목록으로 교체 (어제 종목이 남지 않도록). 0건이면 건드리지 않음
        ("global_highs", lambda: su.replace_by_key("global_highs", hi_rows, "ticker")),
    ]
    if dr:
        def _dr():
            n = su.upsert("global_deep_research", dr, "ticker")
            su.delete_older("global_deep_research", "asof",
                            (_dt.date.today() - _dt.timedelta(days=14)).isoformat())
            return n
        jobs.append(("global_deep_research", _dr))
    brief = overnight_brief(gi, sec, hi)
    if brief:   # 홈(index.html)은 첫 overnight 행을 읽으므로 새 행 추가 대신 같은 행을 갱신
        jobs.append(("global_research", lambda: su.set_by_filter(
            "global_research", "kind", "overnight", {"kind": "overnight", **brief})))
    res, failed = {}, False
    for name, fn in jobs:
        try:
            res[name] = fn()
        except Exception as e:
            res[name] = f"실패: {str(e)[:120]}"
            failed = True
    return res, failed


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    args = sys.argv[1:]
    print("섹터·테마 등락 수집...")
    sec = sectors()
    print(f"  {len(sec)}건")
    print("유니버스(S&P 500 ∪ 나스닥 100)...")
    univ = universe()
    print(f"  {len(univ)}종목")
    hi = highs(univ) if univ else []
    attach_earnings(hi)
    n_ath = sum(1 for r in hi if r["is_ath"])
    n_turn = sum(1 for r in hi if not r["is_ath"] and (r["from_52w_high"] or 0) <= TURN_THRESHOLD)
    print(f"20일 신고가 {len(hi)}종목 (ATH {n_ath} · 전환 후보 {n_turn})")
    for r in sorted(hi, key=lambda r: -(r["vol_ratio"] or 0))[:8]:
        print(f"  {r['ticker']:6} {r['sector']:6} {r['close']:>9} {r['chg_pct']:+.2f}% vol×{r['vol_ratio']} "
              f"52w {r['from_52w_high']} ATH={r['is_ath']} streak={r['ath_streak']}")
    print("리서치 요약 생성 (뉴스·펀더멘털 수집)...")
    dr = deep_research(hi, sec, use_llm="--no-ai" not in args) if hi else []
    if "--push" in args:
        res, failed = push(sec, hi, dr)
        for k, v in res.items():
            print(f"  {k:22} {v}")
        if failed:
            sys.exit(1)        # 스케줄러 로그에서 실패가 보이도록


if __name__ == "__main__":
    main()
