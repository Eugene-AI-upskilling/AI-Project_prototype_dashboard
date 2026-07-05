# -*- coding: utf-8 -*-
"""소스 값 → 홈페이지/Supabase 표시 형식 변환 헬퍼."""
import re, math

def mmdd(s):
    """'2026-06-20' / '20260620' / Timestamp → '06.20'."""
    if s is None:
        return None
    m = re.search(r"(\d{4})-?(\d{2})-?(\d{2})", str(s))
    return f"{m.group(2)}.{m.group(3)}" if m else None

def pct_sign(x, nd=2):
    """숫자 → '+1.23%' / '-4.10%'."""
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return None
    return f"{'+' if x >= 0 else ''}{x:.{nd}f}%"

def billion_to_eok(s):
    """'+142십억원' → '+1,420억' (십억원=10억). '억원'/'억' 단위도 처리."""
    if s is None:
        return None
    txt = str(s).strip()
    m = re.search(r"([-+]?)\s*([\d,]+(?:\.\d+)?)", txt)
    if not m:
        return None
    sign = "-" if m.group(1) == "-" else "+"
    num = float(m.group(2).replace(",", ""))
    if "십억" in txt:
        num *= 10          # 십억원 → 억
    val = int(round(num))
    return f"{sign}{val:,}억"

def parse_sector_str(s, n=3):
    """'생명보험(+5.54%) | 항공화물(+3.93%)' → [{'name','chg'}, ...] 상위 n개."""
    if s is None:
        return []
    out = []
    for part in str(s).split("|"):
        m = re.search(r"(.+?)\(\s*([-+]?[\d.]+%)\s*\)", part.strip())
        if m:
            out.append({"name": m.group(1).strip(), "chg": m.group(2).strip()})
    return out[:n]

def tone_from(x):
    """숫자/문자 부호 → 'up'(상승=빨강) / 'down'(하락=파랑). KR 관례."""
    if x is None:
        return "up"
    if isinstance(x, (int, float)):
        return "up" if x >= 0 else "down"
    return "down" if str(x).strip().startswith("-") else "up"

# 코퍼레이트 액션 → (예상 효과, tone)
ACTION_EFFECT = {
    "자사주":   ("수급 개선", "up"),
    "배당":     ("배당 매력", "up"),
    "분할":     ("가치 재평가", "up"),
    "액면분할": ("거래 활성화", "up"),
    "무상증자": ("유동성 개선", "up"),
    "신규상장": ("신규 상장", "up"),
    "합병":     ("구조 변화", "up"),
    "유상증자": ("단기 희석", "down"),
    "상장폐지": ("상장 폐지", "down"),
    "보호예수": ("물량 출회 주의", "down"),
}

def action_effect(category):
    return ACTION_EFFECT.get(str(category).strip(), ("이벤트", "up"))

def clean(v):
    """NaN/None 정리."""
    if v is None:
        return None
    if isinstance(v, float) and math.isnan(v):
        return None
    return v

def scale_minmax(values, lo=2.0, hi=10.0):
    """리스트를 [lo,hi] 범위로 정규화(버블 크기용)."""
    vals = [v for v in values if v is not None]
    if not vals:
        return [lo] * len(values)
    mn, mx = min(vals), max(vals)
    if mx == mn:
        return [(lo + hi) / 2 for _ in values]
    return [None if v is None else lo + (hi - lo) * (v - mn) / (mx - mn) for v in values]
