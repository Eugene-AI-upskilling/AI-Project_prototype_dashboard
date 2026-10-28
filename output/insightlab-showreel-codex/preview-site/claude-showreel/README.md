# Eugene Insight Lab — Claude 쇼릴 업그레이드

기존 Claude 쇼릴의 타이포그래피, 유진 심볼, 전환 리듬을 바탕으로 Pinterest 레퍼런스의 붉은 조명과 공간감 있는 카드 모션을 추가한 로컬 검토용 버전입니다. 원본 영상과 원본 소스는 보존되어 있습니다. 배포하지 않았습니다.

## 바로 보기

- [원본 / 업그레이드 비교 갤러리](http://127.0.0.1:4183/claude-showreel/)
- [전체 화면 → 쇼릴 카드 축소 히어로 시안](http://127.0.0.1:4183/hero-options/showreel-claude-upgraded.html)
- [이 폴더의 갤러리](index.html): 로컬 HTML로 직접 열 수도 있습니다.
- [업그레이드 실시간 모션](reel-upgraded.html)

로컬 주소는 이 컴퓨터에서 미리보기 서버가 실행 중일 때 열립니다. 갤러리의 탭을 바꾸면 재생 위치를 유지하여 두 영상을 비교합니다. 처음에는 음소거 상태이며, 음악은 **사운드 켜기** 버튼으로 확인할 수 있습니다.

## 추가한 효과

1. **붉은 스포트라이트:** 장면을 이동하는 부드러운 조명으로 유진의 빨간색과 배경의 깊이를 강조합니다.
2. **입체적인 리서치 카드:** 제품 화면과 데이터 카드가 앞뒤로 겹치고 서로 다른 속도로 움직여 공간감을 만듭니다.
3. **전체 화면 → 작은 카드:** 웹사이트에 처음 들어왔을 때 쇼릴이 히어로를 채우고, 스크롤하면 둥근 카드로 축소됩니다. 소개 문구와 리포트 버튼이 함께 나타납니다. 이 효과는 MP4에 들어간 전환이 아니라 웹페이지의 스크롤 인터랙션입니다.

## 저장 위치

이 폴더:

```text
C:\Users\anjs9\OneDrive\바탕 화면\Eugene_AI_Project\output\insightlab-showreel
```

| 파일 | 용도 |
| --- | --- |
| `index.html` | 원본 / 업그레이드 영상 비교 갤러리 |
| `EugeneInsightLab_Showreel_15s_Upgraded.mp4` | 업그레이드 영상. 15초, 1920 × 1080, 60fps, H.264 + AAC 스테레오 48kHz. 9,031,006바이트 |
| `EugeneInsightLab_Hero_Upgraded.mp4` | 웹사이트 배경용 영상. 15초, 1280 × 720, 30fps, 오디오 트랙 없음. 1,977,863바이트 |
| `poster-upgraded.jpg` | 업그레이드 영상의 포스터 |
| `reel-upgraded.html` | 업그레이드 모션의 실시간 재생 / 렌더 소스 |
| `EugeneInsightLab_Showreel_15s.mp4` | 보존된 Claude 원본 영상 |
| `reel.html` / `render.js` / `audio.js` | 보존된 Claude 원본 소스 |
| `PretendardVariable.woff2` | 로컬 서체 |

히어로 시안은 다음 파일에 저장됩니다.

```text
C:\Users\anjs9\OneDrive\바탕 화면\Eugene_AI_Project\yujin-research-center\hero-options\showreel-claude-upgraded.html
```

## 검토할 부분

- 원본과 업그레이드를 같은 장면에서 비교하여 조명과 카드 움직임이 리서치 정보를 잘 보여주는지 확인하세요.
- 히어로 시안에서 스크롤하며 영상 축소와 소개 문구의 등장 시점을 확인하세요.
- 사운드는 전체 쇼릴에서, 실제 사이트의 첫 화면은 음소거 상태로 검토하세요.

## 확인 결과

2026-10-02 로컬 파일과 미리보기 서버에서 확인했습니다.

- 최종 MP4 두 파일의 사양을 확인했고, 전체 디코딩 오류가 없습니다.
- 갤러리에서 업그레이드 영상이 1920 × 1080, 15초로 재생됩니다. 브라우저 기본 재생 컨트롤을 사용하며, 첫 로드는 음소거·일시정지 상태입니다.
- 사운드 버튼을 누르면 음악과 영상이 재생됩니다. 탭을 바꿔도 재생 위치와 음소거 상태를 유지합니다. 8.62초에서 원본과 업그레이드를 오가는 비교를 확인했습니다.
- 재생 중 탭을 바꾸면 새 버전도 이어서 재생합니다.
- 1440px 데스크톱과 390px 모바일에서 가로 넘침과 JavaScript 오류가 없습니다.

[갤러리 확인 기록](qa/gallery-upgraded-check.json) · [데스크톱 캡처](qa/gallery-desktop-upgraded.png) · [모바일 캡처](qa/gallery-mobile-upgraded.png)

히어로에서도 실제 15초 영상의 무음 자동 재생, 전체 화면에서 카드로 축소, 포인터 조명과 기울기, 키보드 건너뛰기와 모달 닫기를 확인했습니다. 모바일 가로 넘침이 없으며, 모션 감소 설정과 JavaScript가 꺼진 환경에서도 소개와 포스터를 볼 수 있습니다.

[히어로 확인 기록](qa/hero-upgraded-qa.json) · [전체 화면 / 축소 후 비교](hero-upgraded-review.jpg)

현재 파일은 디자인 검토용이며 배포하지 않았습니다.
