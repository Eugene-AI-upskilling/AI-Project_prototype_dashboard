# Pinterest Website Effect 검토 — Eugene Insight Lab

사용자가 공유한 [Pinterest 보드](https://kr.pinterest.com/anjs92/eugene-insight-lab/)의 주요 레퍼런스를 확인했습니다.
RedSun과 Credix는 핀에서 원본 링크를 확인하고 공개 데모의 구현도 검토했습니다.
보드의 핀 수는 21개였으며, Credix 등 같은 디자인이 여러 번 저장되어 있었습니다.
아래는 주요 레퍼런스의 효과를 기술별로 정리한 결과입니다. 모든 핀의 전체 영상을 개별 분석했다는 의미는 아닙니다.

| 확인한 레퍼런스 | 효과 | 유진 사이트 적용 |
|---|---|---|
| [Perfect Scroll Animation Lighting](https://kr.pinterest.com/pin/845339792604958298/) / [RedSun 원본](https://ovo-redsun.webflow.io/) | 스크롤에 연결된 타이틀 이동·투명도, 원형 조형 회전, 앱 프레임 확대. 공개 구현에 `Hero (Home V1) Animation` / `SCROLL_PROGRESS` 확인 | 전체 화면 쇼릴이 카드로 축소되며 소개·CTA를 드러내는 전환에 가장 적합 |
| [RedSun 원본](https://ovo-redsun.webflow.io/) | 포인터를 따라가는 흐린 조명. 공개 구현에 `Light Follow Mouse` / `MOUSE_X`, `MOUSE_Y` 확인 | 리서치·인사이트 카드의 가벼운 붉은 조명으로 제한해서 사용 |
| [Credix 핀](https://kr.pinterest.com/pin/845339792604958331/) / [Credix 원본](https://ovo-credix.webflow.io/) | 무음·자동·반복 재생되는 히어로 배경 영상. 원본의 MP4 요소 확인 | 3D 조형을 영상 안에서 연출하고, 사이트에서는 최적화된 MP4로 재생 |
| [Credix 공식 설명](https://webflow.com/templates/html/credix-website-template) | 섹션·아이콘·히어로 등장 모션 | 리포트 제목과 카드에 짧은 순차 등장. 중요한 숫자와 표는 안정적으로 유지 |

## 추천 조합

전체 화면 쇼릴 → 스크롤에 따라 둥근 프레임으로 축소 → 소개·리포트 CTA·지수 등장.
그 아래 정보 섹션에는 작은 위치 이동과 붉은 조명만 적용하는 구성이 적합합니다.
정보 탐색의 속도를 유지하면서 첫 화면에서 브랜드의 인상을 강하게 만들 수 있습니다.

이 전체 화면에서 카드로 축소되는 조합은 사용자의 요청에 맞춘 제안입니다.
참고 사이트가 동일한 전환을 그대로 구현한다고 단정하지 않습니다.
기법명은 **Sticky / pinned video shrink**, **Full-screen-to-card transition**으로 전달하면 됩니다.

## 로컬 시안

- [전체 화면 → 축소](http://127.0.0.1:4183/hero-options/showreel-immersive.html)
- [레드 쇼릴 감상](http://127.0.0.1:4183/showreel/)
- [기존 분할형 히어로](http://127.0.0.1:4183/)

모바일에서는 가로 영상의 문구가 잘리지 않도록 원래 영상 비율을 유지합니다.
모션 감소 설정에서는 큰 축소 연출을 건너뛰고 정지 포스터와 일반 히어로를 보여줍니다.

이번 레드 수정본과 몰입형 시안은 로컬 파일만 수정했습니다. 배포하지 않았습니다.
이전에 공유된 외부 미리보기 주소에는 예전 블루 버전이 남아 있습니다.
