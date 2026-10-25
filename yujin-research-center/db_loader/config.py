# -*- coding: utf-8 -*-
"""경로 설정 + 최신 날짜 파일 탐색."""
import os, glob, re

# 기존 파이프라인 폴더 (실데이터 소스)
# 주간 테마 폴더는 "주간 테마 로테이션 자료 작성" → "theme_rotation_report" 로 이름이 바뀌었는데
# 이 상수가 옛 이름을 가리키고 있어 metrics 파일을 못 찾았다(themes 0건 → 홈페이지 버블차트가
# 2026-06-26 스냅샷에 멈춤). 실제로 존재하는 후보를 골라 쓴다 — 폴더명이 또 바뀌어도 죽지 않게.
_WEEKLY_CANDIDATES = [
    r"C:\Users\anjs9\OneDrive\바탕 화면\eugene_research\theme_rotation_report\weekly-theme-report",
    r"C:\Users\anjs9\OneDrive\바탕 화면\eugene_research\주간 테마 로테이션 자료 작성\weekly-theme-report",
]
WEEKLY_DIR = next((d for d in _WEEKLY_CANDIDATES if os.path.isdir(d)), _WEEKLY_CANDIDATES[0])
DAILY_DIR  = r"C:\Users\anjs9\OneDrive\바탕 화면\eugene_research\daily_report\daily_report_agent"
EUGENE_AI_DIR = r"C:\Users\anjs9\OneDrive\바탕 화면\Eugene_AI_Project"

def global_earnings_path():
    """해외 98종목 실적/커버리지 (Eugene_AI_Project)."""
    p = os.path.join(EUGENE_AI_DIR, "output", "global_earnings.xlsx")
    return p if os.path.exists(p) else None

def global_market_summary_path():
    """최신 밤사이 美 시황 요약 파일."""
    files = glob.glob(os.path.join(EUGENE_AI_DIR, "output", "global_market_summary_*.xlsx"))
    return max(files) if files else None

# ── 주간 테마 ──
def weekly_metrics_path(date=None):
    """theme_weekly_metrics_<YYYY-MM-DD>.xlsx — date 없으면 최신 폴더."""
    base = os.path.join(WEEKLY_DIR, "output", "weekly_report")
    if date:
        return os.path.join(base, date, f"theme_weekly_metrics_{date}.xlsx")
    dirs = [d for d in glob.glob(os.path.join(base, "*")) if re.search(r"\d{4}-\d{2}-\d{2}$", d)]
    if not dirs:
        return None
    latest = max(dirs)  # YYYY-MM-DD 사전순 = 시간순
    d = os.path.basename(latest)
    return os.path.join(latest, f"theme_weekly_metrics_{d}.xlsx")

# ── 데일리 ──
def _latest_daily(prefix, ext, date=None):
    """data/(processed|raw)/<prefix>_<YYYYMMDD>.<ext>"""
    sub = "raw" if prefix in ("market_tone", "op_consensus") else "processed"
    folder = os.path.join(DAILY_DIR, "data", sub)
    if date:
        d = date.replace("-", "")
        return os.path.join(folder, f"{prefix}_{d}.{ext}")
    files = glob.glob(os.path.join(folder, f"{prefix}_[0-9]" * 1 + "*.{}".format(ext)))
    files = [f for f in files if re.search(rf"{prefix}_\d{{8}}\.{ext}$", os.path.basename(f))]
    return max(files) if files else None

def signals_path(date=None):      return _latest_daily("signals", "csv", date)
def market_tone_path(date=None):  return _latest_daily("market_tone", "csv", date)
def op_consensus_path(date=None): return _latest_daily("op_consensus", "csv", date)

def date_from_path(path):
    """파일명에서 날짜 추출 → 'YYYY-MM-DD'."""
    if not path:
        return None
    m = re.search(r"(\d{4})-?(\d{2})-?(\d{2})", os.path.basename(path))
    return f"{m.group(1)}-{m.group(2)}-{m.group(3)}" if m else None
