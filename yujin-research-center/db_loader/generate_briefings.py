# -*- coding: utf-8 -*-
"""매일 시황·리포트 AI 앵커 브리핑 자동 생성.

흐름: Supabase 데이터 → 대본 생성(템플릿) → HeyGen(고정 아바타+보이스, 매일 새 대본)
      영상 생성 → 완료 폴링 → mp4·썸네일 다운로드 → Supabase Storage 업로드
      → ai_briefings 갱신(video_url·thumbnail·script·caption, ?v 캐시버스트).

아바타/보이스(=사람)는 고정, 대본만 매일 바뀐다.

사용법 (yujin-research-center 폴더에서):
  python -m db_loader.generate_briefings                 # market + reports 둘 다
  python -m db_loader.generate_briefings --kind market
  python -m db_loader.generate_briefings --dry           # 대본만 출력(영상 생성 안 함)
필요(.env): HEYGEN_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
아바타/보이스는 아래 ANCHORS 기본값(또는 .env HEYGEN_*_AVATAR_ID/VOICE_ID 로 override).
"""
import os
import sys
import time
import argparse
import requests
from requests.adapters import HTTPAdapter
try:
    from urllib3.util.retry import Retry
except Exception:
    Retry = None

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except Exception:
    pass

from . import supabase_upsert as su
from .push_briefing_video import upload_to_storage

# 연결 리셋(WinError 10054)·일시 장애에 견고한 세션 (HeyGen 상태 폴링·CDN 다운로드 포함)
_S = requests.Session()
if Retry is not None:
    _S.mount("https://", HTTPAdapter(max_retries=Retry(
        total=6, connect=6, read=6, backoff_factor=2,
        status_forcelist=[429, 500, 502, 503, 504])))

GEN_URL = "https://api.heygen.com/v2/video/generate"
STATUS_URL = "https://api.heygen.com/v1/video_status.get"

# 사람(포토 아바타 look + 보이스) 고정. 필요 시 .env 로 override.
# ※ HeyGen '포토 아바타'는 그룹 안의 look_id 로 생성(character.type=talking_photo).
#   사용자가 준 값은 그룹 ID였고, 아래는 그룹 내 실제 look_id.
ANCHORS = {
    "market": {  # 시황 — 여자 앵커 (그룹 AI앵커 aa592646…)
        "look_id":  os.getenv("HEYGEN_MARKET_LOOK_ID",  "5c76f6598fa64980a48c27af98790956"),
        "voice_id": os.getenv("HEYGEN_MARKET_VOICE_ID", "849c547d13cd4c5db1e4a6046b077cb7"),
        "title": "오늘의 시황 브리핑",
    },
    "reports": {  # 금일 발간 리포트 — 남자 앵커 (look "AI앵커(남)")
        "look_id":  os.getenv("HEYGEN_REPORTS_LOOK_ID",  "5ea6519493334f92ac92cb2f4fca3edc"),
        "voice_id": os.getenv("HEYGEN_REPORTS_VOICE_ID", "513b14b431b64a578c467c480dd0a9c3"),
        "title": "오늘의 리포트, AI 앵커 브리핑",
    },
}


# ───────── Supabase 조회 헬퍼 ─────────
def _sb_get(table, params):
    r = requests.get(f"{su.URL}/rest/v1/{table}", params=params,
                     headers={"apikey": su.KEY, "Authorization": f"Bearer {su.KEY}"}, timeout=30)
    r.raise_for_status()
    return r.json()

def _fmt_md(d):
    return (str(d)[5:].replace("-", ".")) if d else ""

def _first_sentence(t):
    if not t:
        return ""
    s = str(t).strip()
    for i, ch in enumerate(s):
        if ch in "다.。!?" and i >= 6:
            return s[:i + 1].strip()
    return s


# ───────── 대본 생성 (템플릿) ─────────
def market_script():
    """시황 ~30초 대본."""
    rows = _sb_get("market_snapshot", {"select": "*", "order": "snapshot_date.desc", "limit": "1"})
    if not rows:
        return None, None, None
    m = rows[0]
    d = m.get("snapshot_date")
    strong = ", ".join(s.get("name", "") for s in (m.get("strong_sectors") or [])[:2] if s.get("name"))
    weak = ", ".join(s.get("name", "") for s in (m.get("weak_sectors") or [])[:2] if s.get("name"))
    parts = [f"안녕하세요. {_fmt_md(d)} 시황 브리핑입니다."]
    parts.append(f"코스피는 {m.get('kospi_chg') or '보합'}, 코스닥은 {m.get('kosdaq_chg') or '보합'} 마감했습니다.")
    fs = _first_sentence(m.get("ai_summary"))
    if fs:
        parts.append(fs if fs[-1] in ".。!?" else fs + ".")
    if strong and weak:
        parts.append(f"업종별로는 {strong} 등이 강세, {weak} 등이 약세를 보였습니다.")
    parts.append("이상 오늘의 시황이었습니다.")
    script = " ".join(p for p in parts if p)
    caption = f"{_fmt_md(d)} 시황 — 코스피 {m.get('kospi_chg') or ''}. AI 앵커가 핵심만 정리합니다."
    return d, script, caption


def reports_script():
    """금일 발간 리포트 ~45초 대본 (최신 발간일 기준 상위 4건)."""
    rows = _sb_get("reports", {"select": "*", "order": "published_at.desc,id.asc"})
    if not rows:
        return None, None, None
    latest = rows[0].get("published_at")
    todays = [r for r in rows if r.get("published_at") == latest]
    d = latest
    intro = f"안녕하세요. {_fmt_md(d)} 발간된 유진투자증권 리서치 리포트를 정리해 드립니다."
    rating_kr = {"BUY": "매수", "OVERWEIGHT": "비중확대", "OUTPERFORM": "매수", "ADD": "매수",
                 "HOLD": "중립", "NEUTRAL": "중립", "MARKETPERFORM": "중립",
                 "REDUCE": "비중축소", "SELL": "매도", "UNDERWEIGHT": "비중축소"}
    lines = []
    for r in todays[:5]:
        title = (r.get("title") or "").strip().rstrip(".")
        co = r.get("company") or ""
        rk = rating_kr.get(str(r.get("rating") or "").upper(), "")
        seg = title
        if co:
            seg += f", {co}"
        if rk:
            seg += f" {rk} 의견"
        lines.append(seg.rstrip(".") + ".")
    outro = "자세한 내용은 리서치 리포트 페이지에서 확인하세요. 이상 리포트 브리핑이었습니다."
    script = f"{intro} " + " ".join(lines) + f" {outro}"
    caption = f"{_fmt_md(d)} 발간 리포트 {len(todays)}건을 AI 앵커가 요약합니다."
    return d, script, caption


# ───────── HeyGen 생성 + 폴링 ─────────
def heygen_generate(key, look_id, voice_id, text):
    body = {
        "video_inputs": [{
            "character": {"type": "talking_photo", "talking_photo_id": look_id},
            "voice": {"type": "text", "input_text": text, "voice_id": voice_id, "speed": 1.0},
        }],
        "dimension": {"width": 720, "height": 1280},
    }
    r = _S.post(GEN_URL, headers={"X-Api-Key": key, "Content-Type": "application/json"},
                      json=body, timeout=60)
    j = r.json()
    vid = (j.get("data") or {}).get("video_id")
    if not vid:
        raise RuntimeError(f"HeyGen 생성 요청 실패: {j}")
    return vid


def heygen_wait(key, video_id, timeout_s=900, interval=15):
    t0 = time.time()
    while time.time() - t0 < timeout_s:
        j = _S.get(STATUS_URL, params={"video_id": video_id},
                         headers={"X-Api-Key": key}, timeout=30).json()
        d = j.get("data") or {}
        st = d.get("status")
        if st == "completed":
            return d
        if st in ("failed", "error"):
            raise RuntimeError(f"HeyGen 생성 실패: {d.get('error')}")
        time.sleep(interval)
    raise RuntimeError("HeyGen 생성 시간 초과")


def _thumb_type(b):
    if b[:3] == b"\xff\xd8\xff":
        return "image/jpeg", "jpg"
    if b[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png", "png"
    if b[:4] == b"RIFF" and b[8:12] == b"WEBP":
        return "image/webp", "webp"
    return "image/jpeg", "jpg"


def _upsert_briefing(kind, d, title, caption, script, video_url, thumbnail_url):
    row = {"kind": kind, "brief_date": str(d), "title": title, "caption": caption,
           "script": script, "video_url": video_url, "thumbnail_url": thumbnail_url}
    r = requests.post(f"{su.URL}/rest/v1/ai_briefings?on_conflict=kind,brief_date",
                      headers={"apikey": su.KEY, "Authorization": f"Bearer {su.KEY}",
                               "Content-Type": "application/json",
                               "Prefer": "resolution=merge-duplicates,return=minimal"},
                      json=[row], timeout=30)
    r.raise_for_status()


def run_kind(kind, dry=False):
    cfg = ANCHORS[kind]
    d, script, caption = (market_script() if kind == "market" else reports_script())
    if not script:
        print(f"[{kind}] 데이터 없음 — 건너뜀")
        return
    print(f"[{kind}] brief_date={d} | 대본 {len(script)}자")
    print(f"  대본: {script}")
    print(f"  자막: {caption}")
    if dry:
        return
    key = os.getenv("HEYGEN_API_KEY")
    if not (key and su.URL and su.KEY):
        raise SystemExit("환경변수 누락: HEYGEN_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
    print(f"[{kind}] HeyGen 영상 생성 요청… (look={cfg['look_id'][:8]}…)")
    vid = heygen_generate(key, cfg["look_id"], cfg["voice_id"], script)
    print(f"[{kind}] video_id={vid} — 완료 대기(폴링)…")
    info = heygen_wait(key, vid)

    content = _S.get(info["video_url"], timeout=180).content
    public_url = upload_to_storage(su.URL, su.KEY, f"{kind}-{d}.mp4", content)
    thumb_public = None
    if info.get("thumbnail_url"):
        tb = _S.get(info["thumbnail_url"], timeout=60).content
        mime, ext = _thumb_type(tb)
        thumb_public = upload_to_storage(su.URL, su.KEY, f"{kind}-{d}.{ext}", tb, mime=mime)
    vtag = vid.replace("iv-", "")[:8]
    video_final = f"{public_url}?v={vtag}"
    thumb_final = f"{thumb_public}?v={vtag}" if thumb_public else None
    _upsert_briefing(kind, d, cfg["title"], caption, script, video_final, thumb_final)
    print(f"[{kind}] 완료 → {video_final}")


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    ap = argparse.ArgumentParser()
    ap.add_argument("--kind", choices=["market", "reports"], help="생략 시 둘 다")
    ap.add_argument("--dry", action="store_true", help="대본만 출력(영상 생성 안 함)")
    a = ap.parse_args()
    kinds = [a.kind] if a.kind else ["market", "reports"]
    fail = 0
    for k in kinds:
        try:
            run_kind(k, dry=a.dry)
        except Exception as e:
            fail += 1
            print(f"[{k}] 실패: {e!r}")
    sys.exit(1 if fail else 0)


if __name__ == "__main__":
    main()
