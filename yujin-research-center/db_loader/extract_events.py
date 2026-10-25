# -*- coding: utf-8 -*-
"""데일리 signals → events 레코드 (종목 이벤트).

source: signals_<YYYYMMDD>.csv
  - 코퍼레이트 액션: event_type='event', event_category in (자사주/배당/분할/유상증자/…)
  - 어닝 서프라이즈 : signal in ('Earning Surprise','Earning Shock') (없으면 op_consensus 조인)
"""
import os
import pandas as pd
from . import config, transform as T

ACTION_CATS = set(T.ACTION_EFFECT.keys())


def _ticker(v):
    if pd.isna(v):
        return None
    try:
        return str(int(float(v))).zfill(6)
    except (ValueError, TypeError):
        return str(v)


def extract(date=None, max_per_kind=12):
    path = config.signals_path(date)
    if not path or not os.path.exists(path):
        return {"events": [], "_source": None}
    d = config.date_from_path(path)
    try:
        df = pd.read_csv(path)
    except UnicodeDecodeError:
        df = pd.read_csv(path, encoding="cp949")

    events = []

    # ── 코퍼레이트 액션 ──
    act = df[(df.get("event_type") == "event") & (df.get("event_category").isin(ACTION_CATS))].copy()
    if "signal_strength" in act.columns:
        order = {"High": 0, "Medium": 1, "Low": 2}
        act["_o"] = act["signal_strength"].map(order).fillna(3)
        act = act.sort_values("_o")
    seen = set()
    by_cat = {}
    for _, r in act.iterrows():
        nm = r.get("name")
        if nm is None or pd.isna(nm):
            continue
        cat = str(r["event_category"]).strip()
        key = (nm, cat)
        if key in seen:
            continue
        seen.add(key)
        by_cat.setdefault(cat, []).append(r)
    # 카테고리 라운드로빈 → 유상증자/자사주/배당/분할 등 골고루
    cats = list(by_cat.keys())
    picked = []
    while len(picked) < max_per_kind and any(by_cat.values()):
        for cat in cats:
            if by_cat[cat]:
                picked.append(by_cat[cat].pop(0))
                if len(picked) >= max_per_kind:
                    break
    for r in picked:
        cat = str(r["event_category"]).strip()
        effect, tone = T.action_effect(cat)
        events.append({
            "kind": "action", "ticker": _ticker(r.get("ticker")), "name": r.get("name"),
            "sector": cat, "detail": T.clean(r.get("event_detail")),
            "consensus": None, "actual": None, "surprise": effect, "price_move": None,
            "ref_date": T.mmdd(d), "tone": tone, "signal": T.clean(r.get("signal_strength")),
        })

    # ── 어닝 서프라이즈 (signals 내) ──
    ear = df[df.get("signal").isin(["Earning Surprise", "Earning Shock"])].copy()
    for _, r in ear.iterrows():
        sp = T.clean(r.get("surprise"))
        events.append({
            "kind": "earnings", "ticker": _ticker(r.get("ticker")), "name": r.get("name"),
            "sector": T.clean(r.get("event_category")),
            "actual": _fmt(r.get("value")), "consensus": _fmt(r.get("consensus")),
            "surprise": T.pct_sign(sp * 100 if sp is not None and abs(sp) < 5 else sp, 1),
            "price_move": None, "ref_date": T.mmdd(d),
            "tone": T.tone_from(sp), "signal": T.clean(r.get("signal")),
        })

    # ── 어닝 보강: op_consensus 조인 (signals에 어닝이 없을 때) ──
    if not any(e["kind"] == "earnings" for e in events):
        events += _earnings_from_consensus(date or d, max_per_kind)

    _fill_price_moves(events, d)

    return {"events": events, "_source": path}


def _fill_price_moves(events, date):
    """이벤트 발생일의 종목 등락률(price_move)을 KIS 일봉으로 채운다.

    종목당 1콜이라 중복 티커는 한 번만 조회한다. 키가 없거나 실패하면 None 그대로 둔다
    (프론트는 값이 없으면 해당 칸을 비워서 그린다).
    """
    try:
        from . import kis
    except ImportError:
        return
    if not kis.available():
        return

    cache = {}
    for e in events:
        tk = e.get("ticker")
        if not tk or e.get("price_move") is not None:
            continue
        if tk not in cache:
            cache[tk] = kis.price_move(tk, date)
        e["price_move"] = T.pct_sign(cache[tk], 1) if cache[tk] is not None else None


def _fmt(v):
    if pd.isna(v):
        return None
    try:
        return f"{int(float(v)):,}"
    except (ValueError, TypeError):
        return str(v)


def _earnings_from_consensus(date, limit):
    """op_consensus_<date>.csv: op_actual vs op_consensus → surprise 계산."""
    path = config.op_consensus_path(date)
    if not path:
        return []
    try:
        df = pd.read_csv(path)
    except Exception:
        return []
    out = []
    for _, r in df.iterrows():
        act, con = r.get("op_actual"), r.get("op_consensus")
        if pd.isna(act) or pd.isna(con) or float(con) == 0:
            continue
        sp = (float(act) - float(con)) / abs(float(con)) * 100
        out.append({
            "kind": "earnings", "ticker": str(r.get("ticker")), "name": r.get("name"),
            "sector": None, "actual": _fmt(act), "consensus": _fmt(con),
            "surprise": T.pct_sign(sp, 1), "price_move": None,
            "ref_date": T.mmdd(config.date_from_path(path)),
            "tone": T.tone_from(sp),
            "signal": "Earning Surprise" if sp >= 10 else ("Earning Shock" if sp <= -10 else "Earnings"),
        })
        if len(out) >= limit:
            break
    return out


if __name__ == "__main__":
    import json, sys, io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    print(json.dumps(extract(), ensure_ascii=False, indent=2, default=str))
