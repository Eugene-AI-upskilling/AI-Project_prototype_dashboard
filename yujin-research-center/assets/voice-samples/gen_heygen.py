"""
HeyGen API로 AI 앵커 아바타 영상 생성 → 완료 폴링 → 다운로드
→ assets/anchor-briefing.mp4 저장 (앵커에 이미 연결됨: 바로 재생)

아바타가 voice에 맞춰 자동 립싱크되므로 별도 오디오 합성 불필요.

준비:
  1) pip install requests   (이미 설치돼 있으면 생략)
  2) 환경변수로 API 키 지정 (채팅/코드에 키를 남기지 않기 위함)
       PowerShell:  $env:HEYGEN_API_KEY="발급받은키"
  3) python assets/voice-samples/gen_heygen.py

아바타/보이스/대본은 아래 상수에서 수정.
"""
import os, sys, time, pathlib, requests

API_KEY  = os.environ.get("HEYGEN_API_KEY", "").strip()
AVATAR_ID = "dcb6201a9a714cce9977256423c650fb"
VOICE_ID  = "ace126f121ae4daaae6e6bef02d8db56"
SCRIPT = ("안녕하세요. 7월 3일, 유진투자증권 리서치 브리핑입니다.\n\n"
          "오늘 코스피는 8천 선, 코스닥은 900 선을 나란히 내주며 반도체 주도로\n"
          "급락했습니다. 미국 6월 고용은 시장 예상을 크게 밑돌았고, 국내 채권은\n"
          "금리가 전 구간 하락하며 강세를 보였습니다.\n\n"
          "이상, 오늘의 리포트 브리핑이었습니다.")

OUT = pathlib.Path(__file__).resolve().parents[2] / "assets" / "anchor-briefing.mp4"
CREATE_URL = "https://api.heygen.com/v3/videos"
STATUS_URL = "https://api.heygen.com/v1/video_status.get"

def create():
    body = {"type": "avatar", "avatar_id": AVATAR_ID, "voice_id": VOICE_ID, "script": SCRIPT}
    r = requests.post(CREATE_URL, headers={"X-Api-Key": API_KEY, "Content-Type": "application/json"},
                      json=body, timeout=60)
    if r.status_code >= 300:
        sys.exit(f"생성 실패 {r.status_code}: {r.text[:400]}")
    d = r.json()
    vid = (d.get("data") or {}).get("video_id") or d.get("video_id")
    if not vid:
        sys.exit(f"video_id 를 못 찾음: {d}")
    print("생성 요청 OK, video_id =", vid)
    return vid

def wait(vid):
    for i in range(120):  # 최대 ~20분
        r = requests.get(STATUS_URL, headers={"X-Api-Key": API_KEY},
                         params={"video_id": vid}, timeout=30)
        d = (r.json().get("data") or {})
        st = d.get("status")
        print(f"  [{i:02d}] status={st}")
        if st == "completed":
            return d.get("video_url")
        if st in ("failed", "error"):
            sys.exit(f"생성 실패: {d}")
        time.sleep(10)
    sys.exit("시간 초과: 나중에 다시 상태 확인 필요")

def download(url):
    r = requests.get(url, timeout=120)
    r.raise_for_status()
    OUT.write_bytes(r.content)
    print(f"완료 → {OUT}  ({len(r.content)} bytes). 사이트에서 '브리핑 재생'으로 확인하세요.")

def main():
    if not API_KEY:
        sys.exit("HEYGEN_API_KEY 환경변수를 먼저 설정하세요.")
    download(wait(create()))

if __name__ == "__main__":
    main()
