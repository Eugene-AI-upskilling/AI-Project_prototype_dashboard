# -*- coding: utf-8 -*-
"""해외 AI 리서치 — 글로벌 커버리지/실적 레이더 (Eugene_AI_Project).

source: output/global_earnings.xlsx (98종목)
  sector · ticker · name · next_earnings_date · last_earnings_date
  · eps · eps_estimate · eps_surprise
→ global_quotes 레코드 (커버리지 + 실적 레이더용)
"""
import math
import pandas as pd
from . import config


def _num(v):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    try:
        return round(float(v), 2)
    except (ValueError, TypeError):
        return None


def _date(v):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    s = str(v)[:10]
    return s if len(s) == 10 and s[4] == "-" else None


def extract():
    path = config.global_earnings_path()
    if not path:
        return {"global_quotes": []}
    df = pd.read_excel(path, sheet_name="All")
    rows, seen = [], set()
    for _, r in df.iterrows():
        tk = str(r.get("ticker") or "").strip()
        if not tk or tk in seen:          # 같은 종목이 여러 섹터에 중복 → 첫 행만(upsert 충돌 방지)
            continue
        seen.add(tk)
        rows.append({
            "ticker": tk,
            "name": str(r.get("name") or "").strip(),
            "sector": str(r.get("sector") or "").strip(),
            "next_earnings_date": _date(r.get("next_earnings_date")),
            "last_earnings_date": _date(r.get("last_earnings_date")),
            "eps": _num(r.get("eps")),
            "eps_estimate": _num(r.get("eps_estimate")),
            "eps_surprise": _num(r.get("eps_surprise")),
        })
    return {"global_quotes": rows}


if __name__ == "__main__":
    import sys, io, json
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    res = extract()
    print(f"global_quotes: {len(res['global_quotes'])}종목")
    for q in res["global_quotes"][:6]:
        print(f"  {q['ticker']:6} {q['name'][:24]:24} | {q['sector']:10} | "
              f"실적 {q['next_earnings_date']} | 서프 {q['eps_surprise']}")
