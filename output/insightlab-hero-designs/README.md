# Eugene Insight Lab — 히어로 디자인 4안

2026-10-04 제작. 페이지 자체에서 반응하는 웹 효과를 적용한 디자인 검토용 시안입니다. 유진 레드 `#d21f23`를 공통 브랜드 색으로 사용했습니다. 배포하지 않았습니다.

## 비교 화면

[네 가지 시안 비교](http://127.0.0.1:4192/)

## 새 전체 페이지 디자인 6안

[파란색·깔끔한 디자인과 연결된 하위 구성 비교](http://127.0.0.1:4192/directions/)

파도와 쇼릴 축소 효과를 유지하면서 색, 여백, 히어로 배치와 아래 섹션을 달리한 여섯 시안을 `directions`에 추가했습니다.
[새 시안 제작·검토 안내](directions/README.md)

## A + D + 쇼릴 결합 시안

[Signal to Story — 결합 시안 보기](http://127.0.0.1:4192/e-signal-reel.html)

A의 검은 배경·붉은 입자 파도를 첫 화면에 유지하고, D의 스크롤 축소로 16:9 카드가 된 뒤 15초 쇼릴로 전환합니다.
소개와 리서치 버튼은 카드 옆에 나타납니다. 쇼릴은 축소 전환을 마친 뒤 무음으로 자동 재생하며, 화면 밖에서는 중지합니다.
**15초 쇼릴 보기**를 누르면 고화질 영상이 소리와 함께 모달에서 재생됩니다. Escape 또는 닫기로 종료할 수 있습니다.
모바일은 카드 위·소개 아래로 배치하고, 모션 감소 설정과 작은 높이의 모바일 화면은 축소 없이 읽을 수 있는 순서로 보여줍니다.

- `e-signal-reel.html/css/js`: 결합 시안
- `assets/signal-reel-preview.mp4`: 기존 Claude 기반 빨간색 업그레이드 쇼릴의 웹용 무음 파일, 15초·1280×720·30fps·약 1.98MB
- `assets/signal-reel-full.mp4`: 같은 쇼릴의 전체 영상, 15초·1920×1080·60fps·사운드·약 9.03MB
- `assets/signal-reel-poster.jpg`: 포스터

영상은 `output/insightlab-showreel`의 기존 파일을 그대로 복사했습니다. 원본과 기존 A/B/C/D 시안은 유지됩니다. 배포하지 않았습니다.

[첫 화면 / 축소 후 캡처](hero-signal-story.jpg) · [결합 시안 동작 확인](qa/e-results.json)

1440×900 / 390×844에서 전환과 실제 15초 재생을 확인했습니다. 375×667, 모션 감소, JavaScript 비활성 화면도 확인했습니다.
무음 미리보기 정지·재생, 화면 밖 정지, 고화질 영상의 사운드와 시간 진행, 모달 Escape 닫기와 포커스 복귀를 검증했습니다. 실행 오류와 가로 넘침은 없었습니다.

## 기존 네 가지 디자인

상단의 네 가지 디자인을 한눈에 보고, 아래 실시간 미리보기에서 마우스와 스크롤을 사용할 수 있습니다.
데스크톱 / 모바일 크기를 전환하고 **나란히 비교**를 누르면 두 시안을 동시에 볼 수 있습니다.
각 시안의 **전체 화면으로 열기**를 사용하면 브라우저 창의 실제 크기로 볼 수 있습니다.

| 시안 | 구성 | 페이지에 적용된 효과 |
| --- | --- | --- |
| [A · Signal Field](http://127.0.0.1:4192/a-signal.html) | 검은 화면, 큰 한글, 붉은 입자 바다 | 실제 입체 파도 셰이더, 마우스 주변 입자 상승, 누르는 동안 가속, 스크롤 카메라 변화 |
| [B · Vector Editorial](http://127.0.0.1:4192/b-vector.html) | 따뜻한 종이색, 거대한 INSIGHT 워드마크 | 마우스를 따라 채움과 윤곽 변화, 세 개의 핸들과 좌표, 자동 스윕 |
| [C · Research Orbit](http://127.0.0.1:4192/c-orbit.html) | 버건디 공간, 붉은 구체, 떠 있는 리서치 카드 | 마우스 조명, 카드 깊이와 부유, 카드 선택, 스크롤에 따른 카드 정돈 |
| [D · Red Shift](http://127.0.0.1:4192/d-redshift.html) | 유진 레드 전체 화면, 파도와 벡터 글자 | 전체 장면을 카드로 접는 스크롤 전환, 입자 파도, 벡터 워드마크, 소개 등장 |

## 저장 위치

```text
C:\Users\anjs9\OneDrive\바탕 화면\Eugene_AI_Project\output\insightlab-hero-designs
```

- `index.html`, `compare.css`, `compare.js`: 네 시안 비교 및 실시간 미리보기
- `a-signal.html/css/js`: A
- `b-vector.html/css/js`: B
- `c-orbit.html/css/js`: C
- `d-redshift.html/css/js`: D
- `wave-effect.js`, `vector-effect.js`: 기존 웹 효과의 브라우저용 이식본
- `assets`: 로컬 글꼴과 워드마크
- `qa`: 실제 화면 캡처와 동작 확인 기록
- `serve.js`: 이 폴더만 제공하는 로컬 서버

## 사용한 효과와 레퍼런스

`wave-effect.js`는 사용자가 제공한 `web_effects/scroll_wave_field/ScrollWaveField.tsx`의 Originkit GLSL, 입자 격자, 투영과 커서 반응을 사용합니다.
`vector-effect.js`는 `web_effects/vector_wordmark/VectorWordmark.tsx`의 Originkit 글자 아틀라스, GLSL, 핸들 움직임을 사용합니다.
정적 HTML 프로젝트에서 실행하도록 React 의존성을 제거하고 브라우저 모듈로 이식했으며, 원본 `web_effects` 파일은 보존했습니다.
모바일 입자 밀도, 일시정지, 화면 밖·백그라운드 중지, 모션 감소 및 WebGL 미지원 대체 화면을 더했습니다. 원본 출처 표기는 모듈에 유지했습니다.

Pinterest에서 확인한 [RedSun](https://ovo-redsun.webflow.io/)의 스크롤 연동과 포인터 조명, [Credix](https://ovo-credix.webflow.io/)의 떠 있는 제품 화면 구성을 디자인 레퍼런스로 삼았습니다.
C의 입체 카드와 D의 장면 전환은 유진 리서치에 맞춰 새로 구현한 웹 인터랙션입니다.

## 로컬 서버 다시 실행

이 폴더에서 다음 명령을 실행하세요.

```powershell
node serve.js 4192
```

그다음 `http://127.0.0.1:4192/`을 여세요. 서버는 이 컴퓨터의 `127.0.0.1`에서만 실행됩니다.
ES 모듈을 사용하므로 HTML 파일을 직접 더블클릭하는 대신 로컬 주소로 확인하세요.

## 확인 기록

데스크톱 1440×900과 모바일 390×844에서 실제 렌더링을 확인했습니다. B/C는 375×667에서도 추가 확인했습니다.
모션 감소 설정에서는 읽을 수 있는 정적 화면을 제공합니다.

- [A](qa/a-qa.json): 입자 WebGL, 일시정지/재생, 모바일, 모션 감소
- [B](qa/b-results.json): 벡터 WebGL, 커서 반응, 크기 변경, 모션 감소, WebGL 대체 화면
- [C](qa/c-qa.json): 카드 선택·키보드, 조명과 스크롤, 모바일, 모션 감소
- [D](qa/d-qa.json): 두 효과의 실제 WebGL, 스크롤 축소, 모바일 정돈, 일시정지, 모션 감소
- [비교 화면](qa/compare-results.json): 네 시안 전환, 실제 모바일 미리보기 크기, 나란히 비교, 시안 내부 스크롤, 처음부터 재시작

현재 리서치 카드의 문구와 그래프는 디자인 검토용 콘텐츠입니다. 시안을 선택한 뒤 실제 서비스 콘텐츠와 연결할 수 있습니다.
