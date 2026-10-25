"""
네이버 CLOVA Voice(Premium)로 AI 앵커 브리핑 mp3 생성 → assets/briefing.mp3 저장.
실제 한국 아동 성우 음색이라 Edge TTS 같은 기계음이 없음.

준비:
  1) pip install requests
  2) 네이버 클라우드 플랫폼(NCP)에서 CLOVA Voice Premium 신청 후
     콘솔 > AI·NAVER API > Application 에서 아래 두 값 발급
       X-NCP-APIGW-API-KEY-ID  (Client ID)
       X-NCP-APIGW-API-KEY     (Client Secret)
  3) 환경변수 설정 (PowerShell)
       $env:NCP_CLIENT_ID="xxxx"
       $env:NCP_CLIENT_SECRET="yyyy"
  4) python assets/voice-samples/gen_clova.py

화자(speaker): 남자 아이 = nhajun(하준),  여자 아이 = ndain(다인)
톤 조절: speed(느리게 +, 빠르게 -), pitch(높게 +, 낮게 -)  범위 -5~5
대본은 아래 TEXT 수정.
"""
import os, sys, pathlib, requests

CID = os.environ.get("NCP_CLIENT_ID", "").strip()
SEC = os.environ.get("NCP_CLIENT_SECRET", "").strip()

SPEAKER = os.environ.get("CLOVA_SPEAKER", "nhajun")   # 남자 아이
SPEED   = "1"    # 아이답게 살짝 천천히
PITCH   = "0"

TEXT = ("안녕하세요! 유진 에이아이 앵커예요. 오늘은요, 코스피가 많이 내려서 속상해요. "
        "반도체랑 자동차가 힘이 하나도 없었대요. 외국인이랑 기관이 같이 팔아버렸거든요. "
        "그러니까 오늘은 우리 조심조심 하기예요! 알겠죠?")

OUT = pathlib.Path(__file__).resolve().parents[2] / "assets" / "briefing.mp3"
URL = "https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts"

def main():
    if not CID or not SEC:
        sys.exit("NCP_CLIENT_ID / NCP_CLIENT_SECRET 환경변수를 먼저 설정하세요.")
    headers = {
        "X-NCP-APIGW-API-KEY-ID": CID,
        "X-NCP-APIGW-API-KEY": SEC,
        "Content-Type": "application/x-www-form-urlencoded",
    }
    data = {"speaker": SPEAKER, "text": TEXT, "format": "mp3",
            "volume": "0", "speed": SPEED, "pitch": PITCH}
    r = requests.post(URL, headers=headers, data=data, timeout=60)
    if r.status_code != 200:
        sys.exit(f"실패 {r.status_code}: {r.text[:300]}")
    OUT.write_bytes(r.content)
    print(f"완료 → {OUT}  ({len(r.content)} bytes). 사이트에서 '브리핑 재생'으로 확인하세요.")

if __name__ == "__main__":
    main()
