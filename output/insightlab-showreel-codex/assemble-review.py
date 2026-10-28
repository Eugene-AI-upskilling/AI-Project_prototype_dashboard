from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json

p = Path(__file__).resolve().parent
sheet = Image.new('RGB', (1440, 506), '#130c0e')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('C:/Windows/Fonts/malgun.ttf', 19)
for i, (name, label) in enumerate([
    ('immersive-desktop-open.png', '처음 입장 · 전체 화면 쇼릴'),
    ('immersive-desktop-settled.png', '스크롤 후 · 카드로 축소 / 소개와 CTA 등장'),
]):
    shot = Image.open(p / 'qa' / name).convert('RGB').resize((720, 450))
    sheet.paste(shot, (i * 720, 52))
    draw.text((i * 720 + 22, 13), label, font=font, fill='white')
sheet.save(p / 'hero-transition-review.jpg', quality=92)

gallery = p / 'index.html'
gallery.write_text(gallery.read_text(encoding='utf-8').replace('코발트 블루', '유진 레드'), encoding='utf-8')

(p / 'README.md').write_text('''# Insight in Motion — Eugene Insight Lab

유진 레드 `#d21f23`를 반영한 15초 쇼릴과 로컬 히어로 시안입니다.
크롬 조형의 반사광, 타이포그래피, 데이터 네트워크, 차트까지 레드·화이트·차콜 조합으로 수정했습니다.
오리지널 모션과 128 BPM 사운드트랙을 사용합니다.

## 바로 확인

- [전체 화면 → 축소 히어로 시안](http://127.0.0.1:4183/hero-options/showreel-immersive.html)
- [레드 쇼릴 감상](http://127.0.0.1:4183/showreel/)
- [분할형 히어로](http://127.0.0.1:4183/)

현재 버전은 로컬 검토용이며 배포하지 않았습니다.
이전에 공유한 외부 미리보기에는 예전 블루 버전이 남아 있습니다.

## 결과물

- `insightlab-showreel-15s.mp4` — 1920×1080, 60 fps, 정확히 15초, 사운드 포함.
- `insightlab-hero-loop.mp4` — 1280×720, 30 fps, 정확히 15초, 무음 반복 재생용.
- `insightlab-poster.jpg` — 레드 브랜드 포스터.
- `index.html` — 감상 페이지. 파일을 브라우저에서 직접 열어도 재생할 수 있습니다.
- `reel.html` / `motion.js` — 원본 모션. `?render=1`은 렌더 모드입니다.
- `audio.js` / `showreel.wav` — 직접 합성한 오리지널 사운드.
- `render.js` — 영상과 웹용 루프 내보내기.
- `effect-review.md` — Pinterest 레퍼런스 분류와 적용 제안.
- `hero-transition-review.jpg` — 전체 화면 / 축소 후 화면 비교.
- `delivery.json` / `local-review-qa.json` — 파일 정보와 검증 결과.

## 히어로 소스

- 분할형: `../../yujin-research-center/index.html`
- 전체 화면 축소형: `../../yujin-research-center/hero-options/showreel-immersive.html`
- 공통 쇼릴: `assets/hero-showreel.css`, `assets/hero-showreel.js`
- 축소형 모션: `assets/hero-immersive.css`, `assets/hero-immersive.js`
- 영상 파일: `../../yujin-research-center/assets/showreel/`

축소형은 별도 시안으로 만들었습니다. 첫 화면을 크게 채운 뒤 스크롤에 따라 카드로 줄어들면서
소개, 리포트 CTA, 지수를 보여줍니다. 역방향 스크롤하면 다시 커집니다.
모바일에서는 가로 영상의 문구를 보존하고, 모션 감소 설정에서는 일반 히어로와 포스터를 표시합니다.
일시정지, 사운드 모달, Escape 닫기, 포커스 복원을 지원합니다.

## 재생 및 재렌더

```powershell
node local-preview.js 4183
node audio.js
node render.js stills
node render.js video
```

로컬 서버는 `127.0.0.1`에서만 수신하며 `preview-site`의 공개 파일만 제공합니다.
영상을 재렌더하려면 FFmpeg와 Playwright Chromium이 필요합니다.
현재 워크스페이스에서는 기존 쇼릴 폴더의 Playwright 설치를 사용합니다.

## 확인한 항목

- 영상: 15초, 900프레임, 1080p / 60 fps, 전체 디코딩 오류 없음.
- 히어로 루프: 15초, 450프레임, 720p / 30 fps, 무음.
- 레드 프레임과 소재 반사, 한글과 영문 가독성.
- 데스크톱 / 모바일, 재생과 모달, 키보드 포커스, 모션 감소 설정.
- 몰입형: 스크롤 축소와 복원, 스킵, 1440×900 / 390×844 / 375×667.

영상 내 차트와 문서 그래프는 모션 연출용 가상 데이터입니다.
실제 투자 성과나 예측을 표현하지 않습니다. Claude 원본은 `../insightlab-showreel/`에 있습니다.
''', encoding='utf-8')

receipt = json.loads((p / 'delivery.json').read_text(encoding='utf-8'))
receipt['heroLoop'].pop('firstLastMeanAbsolutePixelDifference', None)
(p / 'delivery.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding='utf-8')
print('Review labels, current red gallery wording, and README saved as UTF-8.')
