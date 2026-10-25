"""
ElevenLabs로 AI 앵커 브리핑 mp3 생성 → assets/briefing.mp3 로 저장.
(피치 조작이 아니라 실제 아이 음색이라 Edge TTS 같은 기계음이 없음)

사용법(터미널):
  1) pip install requests
  2) 환경변수 2개 설정
       ELEVENLABS_API_KEY = 발급받은 키
       ELEVENLABS_VOICE_ID = Voice Library에서 고른 '남자 아이' 목소리 ID
     (PowerShell 예)
       $env:ELEVENLABS_API_KEY="xxxx"
       $env:ELEVENLABS_VOICE_ID="yyyy"
  3) python assets/voice-samples/gen_elevenlabs.py

원하는 대본은 아래 TEXT 를 수정하세요.
"""
import os, sys, pathlib, requests

API_KEY  = os.environ.get("ELEVENLABS_API_KEY", "").strip()
VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "").strip()

# 3~4살 애기 톤 느낌의 애교 대본 (원하는 문구로 바꾸세요)
TEXT = ("안녕하세요! 유진 에이아이 앵커예요. 오늘은요, 코스피가 많이 내려서 속상해요. "
        "반도체랑 자동차가 힘이 하나도 없었대요. 외국인이랑 기관이 같이 팔아버렸거든요. "
        "그러니까 오늘은 우리 조심조심 하기예요! 알겠죠?")

OUT = pathlib.Path(__file__).resolve().parents[2] / "assets" / "briefing.mp3"

def main():
    if not API_KEY or not VOICE_ID:
        sys.exit("ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID 환경변수를 먼저 설정하세요.")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    headers = {"xi-api-key": API_KEY, "Content-Type": "application/json", "Accept": "audio/mpeg"}
    body = {
        "text": TEXT,
        "model_id": "eleven_multilingual_v2",   # 한국어 지원 모델
        "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.35, "use_speaker_boost": True},
    }
    r = requests.post(url, headers=headers, json=body, timeout=60)
    if r.status_code != 200:
        sys.exit(f"실패 {r.status_code}: {r.text[:300]}")
    OUT.write_bytes(r.content)
    print(f"완료 → {OUT}  ({len(r.content)} bytes). 사이트에서 '브리핑 재생'으로 확인하세요.")

if __name__ == "__main__":
    main()
