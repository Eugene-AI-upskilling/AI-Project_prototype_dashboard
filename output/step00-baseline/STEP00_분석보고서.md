# Eugene Insight Lab · STEP 00 기존 디자인 시스템 분석

작성일 2026-10-28 · 범위: 분석·설계만 (코드·DB·배포 변경 없음)

## 0. 근거와 확인 범위

- 기준 소스: `yujin-research-center/` 로컬 파일. 라이브(eugene-insightlab.netlify.app)와 비교한 결과 CSS·JS는 바이트 단위로 동일하고, HTML은 Netlify가 넣는 pretty URL(`ask.html`→`/ask`)과 주석만 다름. 로컬을 기준으로 봐도 됨.
- 스크린샷: `output/step00-baseline/` (PC 1440×900, 모바일 390×844, 라이브 사이트에서 촬영)
  - 홈: `pc-home-01-hero`, `pc-home-{market,market-mid,themes,anchor,reports,events-fx,quant-gate,insights,members,join}`, `m-home-{01-hero,market,themes,anchor,reports}`
  - 로그인·라운지·질문: `pc-login`, `pc-lounge`, `pc-ask`, `m-login`, `m-lounge`
  - 레퍼런스: `ref-sriki/s00~s10`, `books-open-pc`, `books-mobile`
- 스리키 `#books`: Playwright로 직접 열어 DOM·계산된 스타일·번들 JS(`main-B_AQ2EHZ.js`) 소스를 확인함. 7장 수치는 소스에서 읽은 값.
- 직접 확인하지 못한 것: Google OAuth 실제 로그인 왕복(Supabase에서 Google provider가 켜져 있는지는 `/auth/v1/settings` 응답에 따라 코드가 분기함. 실계정 로그인은 해보지 않음), `lounge_api/server.py` 실서버 모드.

## 1. 현재 디자인 시스템

토큰이 세 층으로 나뉘어 있음. 새 컴포넌트는 어느 층 위에 올라가는지 먼저 정해야 함.

### 1-1. 기본 층 `assets/app.css` (Coinone DS 토큰 재스킨, 전 페이지 공통)

| 분류 | 토큰 | 값 |
|---|---|---|
| 브랜드 블루 | `--blue-main` / `--blue-point` / `--blue-sub-1` / `--blue-navy` | `#1b74e4` / `#4dabf7` / `#1c6fe6` / `#0b2e6b` |
| CTA | `--blue-cta`(=`--color-primary`) / hover `--blue-sub-1` | `#3182f6` / `#1c6fe6` |
| 잉크 | `--ink-900` / `--ink-800` / `--ink-500` | `#040505` / `#17181b` / `#6b7684` |
| 그레이 | `--gray-100/200/400/500` | `#eeeff0` `#cfd0d3` `#8d9299` `#616670` |
| 면·선 | `--white` / `--border-neutral`(hairline) / `--surface-tint` | `#fff` / `#dde4eb` / `#ebf0f5` |
| 등락(KR) | `--price-up` / `--price-down` | `#e0344b` / `#143f96` |
| 카드 테두리 | `.card`, `.lx-card` 하드코딩 | `#eef1f5` |
| 폰트 | `--font-sans` | Pretendard Variable(로컬 woff2, 45–920) → Pretendard → 시스템 |
| 타입 스케일 | display/hero/title/lg/link/control/body/micro | 48 / 34 / 27 / 19 / 16 / 15 / 15 / 12px |
| 굵기 | regular~bold | 400 / 500 / 600 / 700 (제목은 800 직접 사용) |
| 행간·자간 | body | `line-height:1.6`, `letter-spacing:-.01em`, 섹션 제목 1.22 / -.025em |
| 간격 | xs~section | 4 / 8 / 12 / 18 / 32 / 48 / 64px, `.section` 72px(모바일 48·40) |
| 라운드 | sm / chip / md / lg / full | 6 / 10 / 14 / 20 / 9999px |
| 그림자 | `--shadow-soft` / `--shadow-pop` | `rgba(17,24,39,.04) 0 2px 8px, …` / `rgba(17,24,39,.10) 0 16px 40px -12px, …` |
| 모션 | `--ease-out` / `--ease-in-out` | `cubic-bezier(.16,1,.3,1)` / `cubic-bezier(.4,0,.2,1)` |
| 지속시간 | micro / toggle / page | 120 / 200 / 300ms |
| 레이아웃 | `.wrap` | max 1120px, 좌우 40px(≤768 20px) |
| 브레이크포인트 | 사용 중 | 980 · 900 · 880 · 768 · 680 · 640 · 520 · 480 |

### 1-2. 홈 v2 층 `assets/v2/hero-blue.css`, `assets/v2/v2.css` (index.html 전용)

| 토큰 | 값 | 비고 |
|---|---|---|
| `--accent` | `#245ce7` | app.css CTA(`#3182f6`)보다 진한 블루. 홈 섹션 버튼·키커에 사용 |
| `--ink` | `#15233c` | app.css `--ink-900`(`#040505`)과 다름 |
| `--muted` / `--muted2` | `#697079` / `#657187` | |
| `--line` / `--line-soft` | `#e4e6e9` / `rgba(21,35,60,.1)` | |
| `--ease` | `cubic-bezier(.22,.8,.2,1)` | |
| 히어로 월드 배경 | `#070e24` (body `data-bg`) | 홈 첫 화면만 다크 네이비 |
| 웨이브 색 | `#2563eb,#5aa6ff,#badcff` (body `data-colors`) | |
| 시황 카드 면 | `#edf2ff` / `#f1effb` / `#ebf7f4`, 라운드 28px | 인라인 `--card`, `--pill` |
| 섹션 헤드라인 | `clamp(40px,4.7vw,76px)`, weight 720, 자간 -.055em | |
| 키커 | 11px, 자간 .13em, weight 700, `--accent` | |
| `.blue-button` | `--accent` 배경, 8px 라운드, 13px/650 | app.css `.btn`과 별개 |

### 1-3. 라운지 층 `assets/lounge.css` (login · lounge · ask · admin)

- 주석대로 app.css 토큰만 사용. 접두사 `lx-`(공용) `lg-`(로그인) `ax-`(질문) `ad-`(관리자).
- 로그인 좌측 패널: `radial-gradient(120% 90% at 0% 0%,#1d4fae 0%,#0b2e6b 48%,#071c47 100%)`, 강조 `#8fc4ff`, 아이브로 `#9fc2ff`.
- 상태 색: 검수 완료 `#11845a`, 재검토 `#b45309`, 시연 바 배경 `--ink-900`, 시연 점 `#f5b546`.

### 1-4. 구조 요약

- 헤더 `.nav`: 64px, sticky, 흰 92% + blur 8px, 하단 hairline. 메뉴 hover 시 2px 밑줄 scaleX. 서브페이지는 `partials.js`가 `.nav--pill`(현재 메뉴 블루 pill)과 브레드크럼·`.phead` 밴드를 주입.
- 모바일 헤더: ≤900px에서 메뉴를 2단 가로 스크롤로 상시 노출 + 햄버거 드로어(`.mnav`, 우측 슬라이드 300ms).
- 푸터: 로고 + 배지 + 면책 문구 한 단, 장식 없음.
- 홈 순서: 히어로(웨이브→쇼릴 접힘) → 시황 가로 핀 카드 3장(#market) → 테마 버블(#themes) → AI 앵커(#anchor) → 카드뉴스 타임라인(#reports) → 종목 이벤트 마퀴(#events-fx) → 퀀트 아이리스 전환(#quant-gate) → 애널리스트 인사이트 → 회원 티저 → CTA 밴드 → 푸터.

## 2. 그대로 재사용할 컴포넌트

| 컴포넌트 | 위치 | 재사용처 |
|---|---|---|
| `.btn` 계열(primary/secondary/text/navy/ghost/sm/lg/block) | app.css | 전 신규 화면의 버튼 |
| `.chip`, `.tabs`, `.ptabs`, `.badge--*` | app.css | 고객 유형 필터, 이벤트 허브 탭 |
| `.card`, `.card--hover`, `.lx-card` | app.css / lounge.css | 고객 홈 위젯, 이벤트 카드 바탕 |
| `.sec-eyebrow` + `.sec-title` + `.sec-sub` | app.css | 서브페이지 섹션 헤드 |
| `.section-kicker`, `.blue-button` | v2.css | 홈 내부 신규 섹션(이벤트 허브 미리보기) |
| `.pulse-card` 구조(카드 면 색·28px 라운드·번호·하단 데이터) | v2.css | 이벤트 허브 카드의 시각 언어 |
| `.pulse` 가로 핀 스크롤 + lerp 루프 | v2.js | 행사 카드가 많을 때 대안 레이아웃 |
| `.reel-card` + `dialog.reel-dialog` + `reel-hero-long.mp4`/`reel-poster-long.jpg` | experience.js, assets/v2 | 로그인 쇼릴 |
| `renderAnchor()` + `.vanchor` | anchor.js, app.css | 고객 홈 브리핑, 홀로그램 AI 옆 영상 |
| 버블 차트 `renderBubbles` + `.theme-split` | index.html 인라인 | 고객 홈 관심 테마 |
| 카드뉴스 뷰어·아카이브 | assets/cardnews/* | WM 고객 기본 포맷(`format:'cardnews'`) |
| `.lg-seg`, `.lg-type`, `.lg-steps`, `.lg-google`, `.lg-note` | lounge.css | 로그인 단계 UI 전부 |
| `.lx-ev` 행사 행 + `IL.EVENTS` | lounge.css, lounge-proto.js | 이벤트 허브 목록·신청 버튼 상태 |
| `.lx-ov`/`.lx-modal`, `.lx-cite`, `.lx-st--*` | lounge.css | 문서 뷰어, 출처 칩, 상태 배지 |
| `#srcOv` 원문 뷰어 | ask.html | Research Room 문서 패널 |
| `IL.personaBar()` 시연 전환 바 | lounge-proto.js | 고객 유형별 홈 시연 |
| `LA.me / request / decide / isStaff`, `IL.gate()` | lounge-auth.js, lounge-proto.js | 권한 분기 |
| `.reveal` / `.in` (IntersectionObserver) | app.css | 신규 섹션 등장 |
| `.toast`, `.fab`, `.skip` | app.css | 공통 |

## 3. 수정이 필요한 컴포넌트

| 대상 | 현재 상태 | 수정 방향 |
|---|---|---|
| `login.html` `.lg-side` | 정적 그라데이션 + 기능 3줄 | 쇼릴 슬롯 추가. 패널 크기·좌우 비율(.92fr/1.08fr)은 유지 |
| `login.js` `enter()` | 무조건 `lounge.html`로 이동 | 통합 라운지로 이동 + 유형별 위젯 분기 (5장) |
| `lounge.html` + `ask.html` | 마이 라운지와 AI 리서치 라운지가 별도 페이지, 질문 기능 중복 | **한 페이지로 통합** (5장). 4개 페르소나 위젯 분기도 여기서 |
| 헤더 "마이 라운지" 버튼(index.html, partials.js) | lounge.html로 감, 메뉴 "AI 리서치 라운지"는 ask.html | 둘 다 통합 페이지로. 버튼 라벨 정리 |
| `lounge.html` "다가오는 행사" 카드 | 목록 3~4행, 대상 필터 | 이벤트 허브로 가는 진입점 추가 |
| `partials.js` NAV | 6개 메뉴, 라벨 "해외 증시" | 홈(index.html)은 "해외 AI 리서치". 라벨 통일 필요. 행사 메뉴 추가 여부 결정 |
| index.html 헤더 `#navUser` | Supabase 세션 기준 | 라운지 세션(`il.session`)과 기준이 달라 시연 모드에선 로그인 버튼이 그대로 보임(`pc-lounge.png`). 같은 기준으로 맞춰야 함 |
| `ask.html` 우측/상단 | 질문 목록 + 답변 카드 | 홀로그램 AI 오브젝트 자리 확보(Research Room) |
| `IL.EVENTS` | 하드코딩 4건(가상) | 데이터 소스 분리 (DB 변경은 다음 단계에서 승인 후) |

## 4. 새로 추가할 컴포넌트

1. **로그인 쇼릴 패널** `lg-reel`: `.lg-side` 안 16:9 영상(무음·loop·poster), 재생/정지, "전체 보기" 시 기존 `reel-dialog` 재사용. reduced-motion이면 poster만.
2. **고객 유형별 홈 위젯 세트**: 법인용(회의용 브리핑·콥데이·DMA 데스크), WM용(카드뉴스·세미나·담당 PB). 새 카드 디자인 없이 `.lx-card` 조합으로.
3. **홀로그램 AI 오브젝트** `ai-holo`: Research Room(ask.html)과 고객 홈의 "AI에게 질문하기" 진입부에만. 크기 고정 영역 안의 캔버스/SVG. 상태 4개(대기·듣는 중·근거 찾는 중·답변 완료).
4. **이벤트 허브** `events-hub`(가칭 행사·세미나 허브): 상단 3D 느낌 카드 캐러셀 + 탭 + 아래 상세 텍스트 스왑 + 목록/캘린더.
5. **행사 카드** `ev-card`: `.pulse-card` 면 색·라운드를 쓰는 세로형 카드(날짜·대상 배지·형식·신청 상태).
6. **권한 안내 배지/잠금 상태**: 승인 대기 고객에게 신청 버튼 비활성 + `IL.GATE_MSG`.

## 5. 페이지별 정보구조 (전 → 후)

**index.html (공개 홈)**
- 전: 히어로 → 시황 → 테마 → 앵커 → 카드뉴스 → 종목 이벤트 → 퀀트 → 인사이트 → 회원 티저 → CTA
- 후: 순서 유지. 종목 이벤트와 퀀트 사이에 "이벤트 허브 미리보기"(행사 2~3건 + 전체 보기) 한 섹션만 추가. 로그인 상태면 회원 티저 자리를 "내 라운지로" 카드로 교체.

**login.html**
- 전: 좌 소개 패널 / 우 3단계(고객 유형 → 소속 → Google·이메일)
- 후: 좌 패널 상단에 쇼릴, 아래 기능 3줄은 축약. 우측 3단계는 그대로. 완료 시 유형별 홈으로 이동.

**마이 라운지(lounge.html) + AI 리서치 라운지(ask.html) → 하나로 통합: "AI 리서치 라운지"**
- 전: 페이지 두 개. 메뉴 "AI 리서치 라운지"는 ask.html, 헤더 버튼 "마이 라운지"는 lounge.html로 감. 질문 기능이 양쪽에 따로 있음(lounge "내 질문" 카드, ask 전체 화면).
- 후: 한 페이지, 한 이름. 메뉴와 헤더 버튼이 같은 곳으로 감.
  - 상단: 인사 + 고객 유형 배지 + 승인 상태 + KPI 4 (lounge 상단 그대로)
  - 본문 좌측 넓은 열: AI Q&A (ask의 질문 입력·질문 목록·답변 카드·원문 뷰어). 홀로그램 AI 오브젝트는 이 열 머리에 작게
  - 본문 우측 열: 유형별 위젯 (법인: 회의용 브리핑·콥데이·DMA/법인영업 / WM: 오늘의 카드뉴스·세미나·담당 PB), 자료함, 관심 종목
  - 로그인 전: Q&A의 검수된 답변만 열람, 개인 위젯 자리엔 로그인 안내
- 주소: 하나로 정하고 다른 쪽은 이동 처리(기존 링크·즐겨찾기 보존). 기본안은 `lounge.html` 유지, `ask.html`은 `lounge.html#ask`로 이동.

**events-hub.html (신규)**
- 헤더 밴드(`.phead`) → 캐러셀(행사 5~7건) → 탭(콥데이·세미나·컨퍼런스콜·설명회) → 선택 행사 상세 → 전체 일정 목록(`.lx-ev` 재사용).

**events.html (종목 이벤트)**: 변경 없음. 이름 충돌만 정리(9장 참고).

## 6. 고객 유형별 UX 설계

코드에 이미 있는 모델을 그대로 씀 (`lounge_members`, `IL.PERSONAS`).

| 구분 | seg | cust_type → persona | 기본 자료 형식 | 담당 연결 | 홈 우선 정보 |
|---|---|---|---|---|---|
| 법인 · 자산운용사 | 법인 | am → am | 회의용 브리핑 | 법인영업 | 섹터 브리핑, 콥데이 1:1 |
| 법인 · 투자자문·일임 | 법인 | ia → ia | 고객 설명자료 | 법인영업 | 설명자료 다운로드, 세미나 |
| 법인 · DMA 전문투자자 | 법인 | dma → dma | 회의용 브리핑 | DMA 데스크 | DMA 설명회, 상담 |
| 법인 · 기타 기관 | 법인 | etc → am | 회의용 브리핑 | 법인영업 | am과 동일 |
| WM · 고액자산가 | WM | hnw → hnw | 카드뉴스 | 담당 PB | 카드뉴스, 자산가 세미나 |

권한 구조 (확인된 코드 기준)
- `role`: customer / analyst / admin. `status`: pending / approved / rejected.
- 쓰기는 RPC `lounge_request`(본인 가입 요청), `lounge_decide`(고객 승인은 승인된 직원, 직원 승인은 admin)만. 테이블 직접 쓰기 막혀 있음(RLS).
- 화면 게이트: `IL.gate()`가 실계정(google·email)이면서 승인 전이면 `pending`. 질문·상담·자료 받기 잠금, 검수된 답변 열람은 허용.
- 시연 모드(`via:'demo'`)는 게이트 통과. 시연과 실계정이 같은 화면을 쓰므로 신규 화면도 `IL.gate()`만 보고 분기해야 함.
- Google OAuth: `/auth/v1/settings`에서 google이 켜져 있으면 `signInWithOAuth`, 꺼져 있으면 시연 모드로 진입. 선택한 유형은 `localStorage['il.pending']`에 보관했다가 돌아온 뒤 `lounge_request`로 저장.

행사 노출 규칙(제안): 행사 `who`가 법인/WM/전체. 승인 대기 고객은 목록은 보되 신청 버튼은 "승인 후 신청".

## 7. 모션 구현 가이드

### 7-1. 스리키 `#books` 실측 결과

요청서에 적힌 "가로 스크롤, 스크롤에 따른 위치·크기 변화"와 실제 구현이 다름.
- `#books`는 sticky 서브 탭 헤더이고, 교재 모션은 바로 아래 `#shelf` 섹션.
- `#shelf`는 **스크롤과 연동되지 않음**. Three.js r160 WebGL 캔버스에 3D 책 5권을 원형 궤도로 배치한 캐러셀이고, 6초 자동 회전 + 화살표 + 탭 + 드래그로 넘김.
- 스크롤에 따라 바뀌는 건 아래 문구 블록(`.gx-swap`)의 등장(opacity·translateY)뿐.

소스에서 읽은 값

| 항목 | 값 |
|---|---|
| 배치 | 각도 θ = R × 2π/N (R = 중앙 기준 상대 인덱스) |
| 위치 | x = sin θ × r × 1.12, z = cos θ × r − r, r = 2.7 (폭 600px 미만 1.7, x계수 .8) |
| 회전 | ry = .5 − θ × .3 (전체가 살짝 비스듬히 정면을 봄) |
| 크기 | 중앙 1.05, 나머지 .9 (좁은 화면 .8) |
| 보간 | 매 프레임 `cur += (target − cur) × .09` (60fps 기준 약 0.4초에 90% 도달) |
| 대기 흔들림 | y = sin(t × 1.1 + i × 1.7) × .06, 회전 미세 흔들림 .02~.05 rad |
| 자동 넘김 | 6초마다 다음. 사용자 조작 시 타이머 리셋, 드래그 중·열림 상태에선 정지 |
| 드래그 | 수평 8px 이상이면 시작, 이동량 / (폭 × .3) 만큼 인덱스 이동, 놓으면 반올림 스냅 |
| 클릭 | 옆 책 클릭 → 그 책으로 이동, 중앙 책 클릭 → 표지가 열림(hinge −2.3rad) + 왼쪽으로 1.05 이동 |
| 카메라 | FOV 30, 위치 (0, .5, 4.7), 바닥 그림자 라디얼 텍스처 |
| 접근성 | 캔버스 `aria-hidden`, 탭은 `role=tablist`, WebGL 실패 시 평면 이미지 버튼 그리드로 대체, reduced-motion이면 흔들림·자동 넘김 끔, 화면 밖이면 렌더 중지 |
| 섹션 높이 | `clamp(360px,32vw,420px)`, 모바일 320px |

### 7-2. 유진 적용 방향 (이벤트 허브 캐러셀)

- 책 대신 기존 `.pulse-card` 언어의 행사 카드(면 색 `#edf2ff`/`#f1effb`/`#ebf7f4`, 라운드 28px, 큰 번호, 하단 데이터 행)를 씀.
- 카드에 한글 텍스트가 많으므로 WebGL 대신 **DOM + CSS 3D transform**으로 같은 궤도 공식을 적용 권장. 글자 선명도, 스크린리더, 클릭 영역을 그대로 유지할 수 있음. Three.js는 홈에 이미 로드되지만 행사 페이지에서 카드 텍스트를 텍스처로 굽는 건 과함.
  - `translate3d(x, 0, z) rotateY(ry) scale(s)`, `perspective: 1200px` 컨테이너
  - 보간은 v2.js와 같은 시간 기반 lerp `1 − exp(−dt × 7)` 사용(프레임 의존 .09 대신, 기존 홈과 손맛 통일)
  - 대기 흔들림은 y ±4px 정도로 줄임(금융 서비스 톤)
  - 자동 넘김 6초는 유지하되 포커스·hover 시 정지, 정지 버튼 노출(기존 `[data-motion-toggle]` 패턴)
- 탭·화살표: `.tabs` / `.btn` 재사용. 스리키의 보라 원형 화살표는 쓰지 않음.
- 아래 상세 블록 전환: `.reveal`과 같은 `opacity + translateY(20px)`, 300ms `--ease-out`.
- 모바일(≤680): 3D 끄고 스냅 가로 스크롤(`.rep-cards`의 `scroll-snap-type:x mandatory` 패턴) + 현재 카드만 scale 1.

### 7-3. 그 외 모션

- 로그인 쇼릴: 패널 진입 시 poster → 600ms 페이드로 영상. 단계 전환은 기존 `lxPop`(300ms) 유지.
- 홀로그램 AI: 지정 영역 안에서만. 색은 기존 `--blue-point #4dabf7`, `#8fc4ff`, `--blue-navy` 계열 위 반투명 라인. 네온 시안·글리치·스캔라인 금지. 상태 전환 200~300ms, 대기 호흡 2.4초 주기 정도.
- 공통: 모든 신규 모션은 `prefers-reduced-motion`에서 정지 상태로 렌더(기존 코드 전부 이 규칙을 지키고 있음).

## 8. 단계별 개발 계획

| 단계 | 내용 | 산출물 | 건드리는 파일 |
|---|---|---|---|
| 01 | **마이 라운지 + AI 리서치 라운지 통합**, NAV 라벨 통일, 헤더 로그인 상태 기준 통일 | 통합 lounge.html, ask.html 이동 처리 | lounge.html, ask.html, partials.js, index.html 헤더 |
| 02 | 로그인 쇼릴 | `.lg-reel` | login.html, lounge.css |
| 03 | 통합 라운지 안 고객 유형별 위젯 분기 | 위젯 분기 | login.js, lounge.html |
| 04 | 이벤트 허브 (정적 데이터) | events-hub.html + 캐러셀 JS | 신규 파일 위주 |
| 05 | 홈에 이벤트 허브 미리보기 | 섹션 1개 | index.html, v2.css |
| 06 | 홀로그램 AI (Research Room) | `ai-holo` | ask.html, 신규 JS |
| 07 | 데이터 연결(행사 테이블·신청) | 마이그레이션 | supabase/ (승인 후) |
| 08 | 회귀 테스트·접근성 점검 → 사용자 확인 → 배포 요청 시 배포 | | |

각 단계는 로컬(`python -m http.server 4210`)에서만 확인하고 배포는 요청이 있을 때만.

## 9. 기존 디자인을 해칠 수 있는 부분

1. **토큰 이중화**: 홈은 `--accent #245ce7`·`--ink #15233c`, 나머지는 `--blue-cta #3182f6`·`--ink-900 #040505`. 신규 화면에서 섞으면 같은 페이지에 블루 두 개가 생김. 서브페이지는 app.css 층, 홈 섹션만 v2 층으로 고정.
2. **다크 히어로 전염**: 홈 첫 화면만 `#070e24`. 홀로그램이나 로그인 쇼릴을 이유로 페이지 배경을 어둡게 바꾸면 요청 원칙 2 위반. 다크는 `.lg-side`, `.vanchor__stage`, 쇼릴 카드처럼 이미 다크인 박스 안에서만.
3. **"이벤트" 이름 충돌**: 메뉴 "종목 이벤트"(DART 실적·기업 액션)가 이미 있음. 행사 허브를 "이벤트"로 부르면 혼동. "행사·세미나" 등 다른 라벨 필요.
4. **스크롤 높이 계산 의존**: v2.js가 `.pulse`, `.cn`, `.qg` 높이를 직접 계산함. 홈에 섹션을 넣으면 `v2:relayout` 이벤트를 보내야 위치가 틀어지지 않음.
5. **WebGL 중복**: 홈은 웨이브 + finance-scenes(Three.js) 캔버스가 이미 여러 개. 홀로그램을 홈에 또 올리면 저사양 기기 부하. Research Room·고객 홈으로 한정.
6. **헤더 높이**: 많은 sticky 계산이 `--nav-h`(64/76px)를 씀. 헤더에 메뉴·배지를 추가해 높이가 바뀌면 히어로·핀 섹션이 어긋남.
7. **시연/실계정 세션 이원화**: `il.session`(localStorage)과 Supabase 세션이 따로 놂. 유형별 홈 분기를 한쪽만 보고 짜면 시연·실사용 중 하나가 깨짐.
8. **인라인 스타일**: 헤더 `#navUser`, 각종 `style="height:36px"` 등. 재사용 시 그대로 복사하면 수정 지점이 늘어남.
9. **캐시 버스터**: CSS/JS가 `?v=` 쿼리로 버전 관리. 공용 파일을 고치면 모든 HTML의 쿼리를 함께 올려야 함.

## 10. 단계별 시각적 회귀 테스트 기준

공통 방법
- Playwright, 라이브 기준 스크린샷(`output/step00-baseline/`)과 로컬 결과 비교. 뷰포트 1440×900, 390×844 두 가지.
- 핀·lerp 섹션은 스크롤 후 1.5초 이상 대기 후 촬영. `pc-home-market-mid.png`는 카드가 위로 밀린 상태로 찍혀 있음. 촬영 타이밍 문제인지 실제 동작인지 01단계 시작 전에 다시 확인 필요.
- 계산된 스타일 검사: `body` 폰트가 Pretendard Variable, `.btn--primary` 배경 `rgb(49,130,246)`, `.nav` 높이 64px, `.card` 라운드 20px, `.sec-title` 색 `rgb(11,46,107)`.

| 단계 | 바뀌면 안 되는 화면 (픽셀 비교, 허용 0.5% 이하) | 새 화면 확인 항목 |
|---|---|---|
| 01 | 홈 전 섹션, login, lounge, ask | 메뉴 라벨 일치, 로그인 상태 표시 일치, 헤더 높이 64px 유지 |
| 02 | 로그인 우측 3단계 영역, 홈 | 좌 패널 폭·라운드 24px·그라데이션 유지, 모바일에서 영상이 단계 UI를 밀어내지 않음, reduced-motion에서 poster |
| 03 | 홈, 로그인 | 5개 유형별 lounge 스크린샷 1세트씩, 승인 대기 잠금 상태, 카드 테두리 `#eef1f5`·그림자 soft 유지 |
| 04 | 기존 전 페이지 | 캐러셀 6초 넘김·정지 버튼·키보드 좌우, 390px에서 가로 스크롤 없음, WebGL 미사용 확인 |
| 05 | 히어로~종목 이벤트, 퀀트 이후 섹션 위치(섹션 top 좌표 오차 2px 이내) | 미리보기 섹션 키커·버튼이 v2 층 토큰 사용 |
| 06 | ask 답변 카드·출처 칩, 홈 | 홀로그램이 지정 박스 밖으로 색·빛이 번지지 않음, 페이지 배경 흰색 유지, 저사양(CPU 4x throttle)에서 60fps 근접 |
| 07 | 전체 | 데이터 없음·실패 시 기존 예시 데이터로 떨어지는지 |

## 결정이 필요한 것

1. 통합 라운지의 주소: `lounge.html` 유지(기본안) 또는 `ask.html` 유지. 고객 유형별 홈은 이 통합 라운지 안에서 분기.
2. 행사 허브 메뉴 이름과 헤더 노출 여부 (메뉴 7개가 되면 1440px에서도 폭 확인 필요).
3. 행사 캐러셀을 DOM 3D로 할지(권장), 스리키처럼 WebGL로 할지.
