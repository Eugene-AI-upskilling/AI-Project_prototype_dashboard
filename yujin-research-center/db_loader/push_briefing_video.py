# -*- coding: utf-8 -*-
"""HeyGen 영상(video_id) → mp4 다운로드 → Supabase Storage 업로드 → ai_briefings.video_url 연결.

사용법 (yujin-research-center 폴더에서):
  python -m db_loader.push_briefing_video --video-id 71bef40c281f4456974a1626c5866e3e --kind reports --date 2026-07-03
필요(.env): HEYGEN_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
"""
import os
import sys
import argparse
import requests

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except Exception:
    pass

BUCKET = "briefings"


def heygen_video_info(video_id, key):
    """HeyGen video_status.get → data dict(video_url, thumbnail_url, duration). 'iv-' 접두어 제거."""
    vid = video_id.replace("iv-", "")
    r = requests.get("https://api.heygen.com/v1/video_status.get",
                     params={"video_id": vid}, headers={"X-Api-Key": key}, timeout=30)
    j = r.json()
    d = j.get("data") or {}
    if d.get("status") != "completed" or not d.get("video_url"):
        raise RuntimeError(f"HeyGen 영상 준비 안됨: status={d.get('status')} msg={j.get('message') or j.get('msg')}")
    return d


def upload_to_storage(url_base, service_key, path, content, mime="video/mp4"):
    up = f"{url_base}/storage/v1/object/{BUCKET}/{path}"
    h = {"Authorization": f"Bearer {service_key}", "apikey": service_key,
         "Content-Type": mime, "x-upsert": "true"}
    r = requests.post(up, headers=h, data=content, timeout=180)
    r.raise_for_status()
    return f"{url_base}/storage/v1/object/public/{BUCKET}/{path}"


def set_briefing(url_base, service_key, kind, date, video_url, thumbnail_url=None):
    patch = f"{url_base}/rest/v1/ai_briefings?kind=eq.{kind}&brief_date=eq.{date}"
    body = {"video_url": video_url}
    if thumbnail_url:
        body["thumbnail_url"] = thumbnail_url
    h = {"Authorization": f"Bearer {service_key}", "apikey": service_key,
         "Content-Type": "application/json", "Prefer": "return=representation"}
    r = requests.patch(patch, headers=h, json=body, timeout=30)
    r.raise_for_status()
    return r.json()


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    ap = argparse.ArgumentParser()
    ap.add_argument("--video-id", required=True)
    ap.add_argument("--kind", default="reports")
    ap.add_argument("--date", required=True, help="brief_date YYYY-MM-DD")
    ap.add_argument("--name", help="storage 파일명 (기본: {kind}-{date}.mp4)")
    a = ap.parse_args()

    key = os.getenv("HEYGEN_API_KEY")
    url_base = (os.getenv("SUPABASE_URL") or "").rstrip("/")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not (key and url_base and service_key):
        raise SystemExit("환경변수 누락: HEYGEN_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")

    print("① HeyGen 영상 정보 조회…")
    info = heygen_video_info(a.video_id, key)
    mp4_url = info["video_url"]
    thumb_url = info.get("thumbnail_url")

    print("② mp4 다운로드…")
    content = requests.get(mp4_url, timeout=180).content
    path = a.name or f"{a.kind}-{a.date}.mp4"
    print(f"③ Storage 업로드… briefings/{path} ({len(content)/1e6:.1f} MB)")
    public_url = upload_to_storage(url_base, service_key, path, content)

    thumb_public = None
    if thumb_url:
        print("④ 썸네일 다운로드·업로드…")
        tbytes = requests.get(thumb_url, timeout=60).content
        # HeyGen은 썸네일을 binary/octet-stream으로 주므로 매직바이트로 이미지 타입 판별
        if tbytes[:3] == b"\xff\xd8\xff":
            ctype, ext = "image/jpeg", "jpg"
        elif tbytes[:8] == b"\x89PNG\r\n\x1a\n":
            ctype, ext = "image/png", "png"
        elif tbytes[:4] == b"RIFF" and tbytes[8:12] == b"WEBP":
            ctype, ext = "image/webp", "webp"
        else:
            ctype, ext = "image/jpeg", "jpg"
        tpath = f"{a.kind}-{a.date}.{ext}"
        thumb_public = upload_to_storage(url_base, service_key, tpath, tbytes, mime=ctype)
    else:
        print("④ 썸네일 없음(HeyGen 응답에 thumbnail_url 없음)")

    # CDN 캐시버스트: 같은 파일명을 덮어써도 새 영상이 바로 반영되도록 ?v=<video_id 앞 8자>
    vtag = a.video_id.replace("iv-", "")[:8]
    video_final = f"{public_url}?v={vtag}"
    thumb_final = f"{thumb_public}?v={vtag}" if thumb_public else None

    print("⑤ ai_briefings 갱신…")
    set_briefing(url_base, service_key, a.kind, a.date, video_final, thumb_final)
    print("   완료.")
    print("\nvideo_url    :", video_final)
    print("thumbnail_url:", thumb_final)


if __name__ == "__main__":
    main()
