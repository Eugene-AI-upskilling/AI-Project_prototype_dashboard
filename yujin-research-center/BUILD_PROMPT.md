# 유진 Insight Lab — 빈 노트북에서 처음부터 구현하는 프롬프트

> **쓰는 법**: 새 노트북에 아래 "0. 준비"만 사람이 직접 하고, 그다음 이 문서 전체를 AI 코딩 에이전트(Claude Code 등)에 붙여 넣은 뒤 "11장 단계대로 1단계부터 진행해줘"라고 하세요. 단계가 끝날 때마다 화면을 확인하고 "다음 단계"라고 하면 됩니다.
> 기존 코드 · 백업이 하나도 없고, git은 **새 계정**으로만 쓸 수 있는 환경(기존 GitHub 저장소 Eugene-AI-upskilling · codikids에는 접근 불가)을 전제로 썼습니다. 새 계정에 새 비공개 저장소를 만들어 처음부터 관리합니다. 참고용 완성본: https://eugene-insightlab.netlify.app (2026-10-29 배포본)

---

## 0. 준비 (사람이 직접 · 약 20분)

1. **프로그램 설치**
   - Git — https://git-scm.com (Git Bash 함께 설치) · GitHub CLI — https://cli.github.com
   - Node.js 20 LTS 이상 — https://nodejs.org (Netlify CLI · Jarvis 앱용)
   - Python 3.12 이상 — https://python.org (설치 시 "Add to PATH" 체크 · 로컬 서버 · API 서버용)
   - VS Code + Claude Code 확장(또는 터미널 `npm i -g @anthropic-ai/claude-code`)
   - Netlify CLI — `npm i -g netlify-cli`
2. **계정 · 접근 확인** (없으면 각 항목의 '대안'으로 진행)
   | 필요한 것 | 어디서 | 없을 때 대안 |
   |---|---|---|
   | GitHub **새 계정** | github.com 가입 → `gh auth login` | 저장소 없이 로컬 git만 써도 됨(원격 push만 생략) |
   | Supabase 프로젝트 URL · anon key | 기존 프로젝트 `https://zvnnpwdfeaakhxklcjfk.supabase.co` → Dashboard › Settings › API. 또는 완성본 사이트의 `assets/partials.js` 안 `SUPABASE_ANON` 값 | 새 Supabase 프로젝트를 만들고 9장 SQL로 테이블 생성 → 데이터는 비어 있어도 화면은 기본값(예시)으로 동작 |
   | Netlify 계정 (site id `dd1e599a-cbc4-43a1-9fab-3e28d6678c12`) | `netlify login` | 새 사이트로 배포해도 됨 |
   | Claude API 키 | console.anthropic.com | AI 답변 · 요약 기능만 꺼진 채로 동작 |
   | AI 앵커 영상 | Supabase Storage `briefings/` (테이블 `ai_briefings`에 URL) | 영상 없이 썸네일 · '브리핑 준비 중' 안내로 동작 |
3. **작업 폴더 · 새 저장소 만들기** (Git Bash)
   ```bash
   git config --global user.name "이름"; git config --global user.email "새계정 이메일"
   mkdir -p Eugene_AI_Project/yujin-research-center Eugene_AI_Project/_secrets && cd Eugene_AI_Project
   git init -b main
   printf '_secrets/\n.env\n.env.*\n**/node_modules/\n**/.next/\n**/__pycache__/\n*.pyc\ndist/\n.netlify/\n**/gmail_token.json\n**/gmail_credentials.json\n**/.kis_token.json\n**/*.db\n' > .gitignore
   git add .gitignore && git commit -m "init"
   gh repo create eugene-insightlab --private --source . --remote origin --push   # 새 계정의 비공개 저장소
   cd yujin-research-center
   ```
4. **이전 자료가 있다면** 먼저 활용: 이전 노트북의 백업 zip(`Eugene_AI_Project_슬림_*.zip`), git bundle(`Eugene_AI_Project.bundle` → `git clone`으로 이력까지 복원 후 `git remote set-url origin <새 저장소>`), 또는 Netlify 관리 화면 › Deploys › 최신 배포 › Download 파일이 있으면 그걸 기준으로 하고 에이전트에게 "이 폴더를 기준으로 이어서 개발해줘"라고 하세요. 아무것도 없을 때만 이 문서대로 처음부터 만듭니다.
5. 비밀값(.env · 토큰 json)은 사이트 폴더 **밖** `Eugene_AI_Project/_secrets/`에만 둡니다(.gitignore로 제외). 저장소가 비공개여도 비밀값은 커밋하지 않고, 메신저 · 메일로 보내지 않습니다. 클라이언트 코드에 넣어도 되는 것은 **Supabase URL과 anon key뿐**입니다.

---

## 1. 너의 역할과 작업 규칙 (에이전트에게)

너는 유진투자증권 리서치센터의 고객용 리서치 플랫폼 **"유진 Insight Lab"**을 처음부터 만드는 프론트엔드 · 풀스택 엔지니어다.

- 11장 단계 순서대로 만든다. 단계마다 `python -m http.server 4210`으로 띄워 브라우저(1440px · 390px)에서 확인하고, 콘솔 오류 0건을 확인한 뒤 결과를 보고하고 멈춘다.
- **실데이터가 없는 숫자를 실데이터처럼 보여 주지 않는다.** 코드 기본값(예시)은 화면에 '예시' 배지를 붙이고, Supabase에서 값이 오면 덮어쓴다.
- 같은 기능을 두 번 만들지 않는다. 여러 페이지가 쓰는 것은 `assets/` 모듈로 뺀다(5장 파일 구조).
- 배포는 사용자가 "배포해줘"라고 할 때만, 12장 절차로.
- 저장소는 **새 GitHub 계정의 비공개 저장소**(0장 3번)다. 기존 저장소(Eugene-AI-upskilling/AI-Project_prototype_dashboard · codikids/*)에는 접근하지 않는다.
- 단계가 끝나 사용자가 확인하면 커밋하고 push한다. 커밋 전 `git status`로 `_secrets/` · `.env` · 토큰 json이 스테이징되지 않았는지 확인한다.
  ```bash
  git add -A && git commit -m "단계N: <요약>" && git push
  ```
- 영상(mp4)은 50MB가 넘으면 커밋하지 않는다(GitHub 100MB 제한). 큰 영상은 Supabase Storage에 올리고 URL로 쓴다.

---

## 2. 서비스 개요

- **무엇**: 유진투자증권 리서치센터의 리포트 · 시황 · 테마 · 종목 이벤트 · 행사 · 퀀트 도구를 고객 유형별로 묶은 웹 플랫폼(시연용 프로토타입, 실제 주문 · 접수 없음)
- **고객 유형** — `localStorage['il.session'].persona`
  | persona | 구분 | 유형 | 시연 이름 · 소속 | 기본 자료 형식 | 담당 | 관심 분야 |
  |---|---|---|---|---|---|---|
  | `am` | 기관 | 자산운용사 | 김민준 · 한빛자산운용(가상) | 회의용 브리핑 | 법인영업 담당 | 반도체 · AI 인프라 · 2차전지 |
  | `ia` | 기관 | 투자자문 · 일임사 | 이서연 · 온결투자자문(가상) | 고객 설명자료 | 법인영업 담당 | 반도체 · 금리 · 배당주 |
  | `dma` | 기관 | DMA 전문투자자 | 박지훈 · 개인 전문투자자(가상) | 회의용 브리핑 | DMA 데스크 | 반도체 · 미국 기술주 · 환율 |
  | `etc` | 기관 | 기타 기관(연기금 · 보험 · 은행) | am과 같은 화면 | | | |
  | `hnw` | WM | 고액자산가 | 최은정 · 강남금융센터 고객(가상) | 카드뉴스 | 담당 PB | 반도체 · 배당주 · 미국 금리 |
- 세션 형식: `{role:'customer', name, seg:'법인'|'WM', cust_type, persona, org|branch, status:'approved'|'pending', via:'demo'|'google'|'email'}`
- 기관과 WM은 **같은 컴포넌트**를 쓰고, 다른 부분만 `persona==='hnw'` 한 가지 조건으로 갈라 노출한다.

## 3. 기술 스택 · 제약

- **프론트**: 프레임워크 · 빌드 없는 정적 사이트(HTML + CSS + vanilla JS). 페이지마다 `.html` 하나 + 공용 `assets/`.
- **폰트**: Pretendard Variable — CDN `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css`
- **데이터**: Supabase JS v2 CDN `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`, anon key + RLS(읽기 공개, 쓰기는 본인 행만)
- **API 서버(선택)**: `lounge_api/` — Python 표준 라이브러리 `http.server` 기반, `/api/*` (8장). 운영은 Render 무료 플랜.
- **홈 홀로그램(선택)**: 별도 Next.js 15 앱 `jarvis/`(React 19 · three.js · @react-three/fiber · framer-motion). `?embed=hero`로 iframe 임베드. 없으면 CSS로 만든 대체 오브.
- **서버 주소**: `assets/config.js` 한 곳 — `window.IL_CONFIG={apiBase, jarvisUrl}` (로컬이면 `''`/`http://localhost:3300`, 운영이면 Render 주소)
- **AI**: Claude API 키는 서버 환경변수 `ANTHROPIC_API_KEY`에만.
- **호스팅**: Netlify 정적 배포.

## 4. 디자인 시스템

토스풍의 밝고 깨끗한 금융 UI. 흰 바탕 + 블루, 부드러운 그림자, 넉넉한 여백. 다크(네이비)는 홈 히어로 · 앵커 섹션 · 지수 스트립에만.

```css
:root{
  --blue-main:#1b74e4; --blue-point:#4dabf7; --blue-sub-1:#1c6fe6; --blue-navy:#0b2e6b; --blue-cta:#3182f6;
  --ink-900:#040505; --ink-800:#17181b; --ink-500:#6b7684;
  --gray-100:#eeeff0; --gray-200:#cfd0d3; --gray-400:#8d9299;
  --white:#fff; --border-neutral:#dde4eb; --surface-tint:#ebf0f5;
  --price-up:#e0344b; --price-down:#143f96;               /* 한국식: 상승 빨강 · 하락 깊은 네이비 */
  --color-primary:var(--blue-cta); --color-muted:var(--ink-500); --color-hairline:var(--border-neutral);
  --text-display:48px; --text-hero:34px; --text-title:27px; --text-lg:19px; --text-link:16px; --text-body:15px; --text-micro:12px;
  --space-xs:4px; --space-sm:8px; --space-md:12px; --space-lg:18px; --space-xl:32px; --space-xxl:48px; --space-section:64px;
  --radius-sm:6px; --radius-chip:10px; --radius-md:14px; --radius-lg:20px; --radius-full:9999px;
  --shadow-soft:rgba(17,24,39,.04) 0 2px 8px 0,rgba(17,24,39,.04) 0 1px 2px 0;
  --shadow-pop:rgba(17,24,39,.10) 0 16px 40px -12px,rgba(17,24,39,.05) 0 4px 12px 0;
  --ease-out:cubic-bezier(.16,1,.3,1); --dur-micro:120ms; --dur-toggle:200ms; --dur-page:300ms;
  --font-sans:"Pretendard Variable","Pretendard",-apple-system,system-ui,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;
}
```

- **공통 컴포넌트 (`assets/app.css`)**: `.wrap`(max 1040px 가운데) · `.section` · `.sec-head`(`.sec-eyebrow` 파란 점 + 대문자 영문, `.sec-title`, `.sec-sub`) · `.card > .card__body` · `.badge--brand/muted/up/down/point` · `.btn--primary/secondary/text/sm/block` · `.tabs`(회색 pill 안의 흰 활성 탭) · `.chip`(.is-active 검정) · `.tbl`(.num 오른쪽 정렬) · `.ai-summary`(별 아이콘 + 요약) · `.toast` · `.fab`(맨 위로)
- **AI 앵커 카드(`.vanchor`)**: 영상 스테이지(세로 3:4~4:5, 포스터 이미지, LIVE 라벨, 재생 버튼, 파형 · 진행 바) + 아래 본문(eyebrow · 제목 · 캡션 · "브리핑 재생 ▶" 버튼). 옆에 챕터 목록 카드(번호 원 · 제목 · 부제 · 시간).
- **모션**: 목적 있는 모션만. 영역 전환은 opacity 0→1 + translateY 8px→0, 0.32~0.38초 ease-out. hover는 translateY(-2~-3px) + 그림자. 모든 애니메이션에 `@media (prefers-reduced-motion: reduce)` 대응.
- **숫자**: `font-variant-numeric: tabular-nums`, 등락은 색 + 부호를 함께(+1.20% / -0.48%).
- **반응형**: 1440 / 1000 / 768 / 390. 390px에서 가로 스크롤이 생기면 안 된다. 모바일 상단 메뉴는 두 줄(로고 + 햄버거 / 메뉴 pill).
- **접근성**: 탭 `role="tablist"`/`role="tab"`/`aria-selected` + ←→ 키, 모달 포커스 가두기 + ESC, 상태 변화 `aria-live`, 이미지 alt.

## 5. 파일 구조 (최종 모습)

```
yujin-research-center/
  index.html            진입: 쇼릴 → 고객 유형 → 로그인 → 승인 대기
  home.html             Home
  conferences.html      Events
  market.html           Research (시황 중심 · 국내/해외)
  quant.html            Quant Studio (기관 전용)
  desk.html             Private Desk
  reports.html          리서치 리포트 목록 · 상세 (메뉴 없음, 링크로만)
  global.html           해외 증시 · 신고가 (메뉴 없음)
  cardnews.html         카드뉴스 단독 뷰어 (?file= / ?export=1 PNG용)
  admin.html            애널리스트 검수 (role analyst/admin)
  lounge.html ask.html events.html mypage.html   → 리다이렉트만 (12장)
  assets/
    app.css             토큰 · 공통 컴포넌트
    config.js           서버 주소
    gate.js             로그인 보호 (head 첫 줄)
    partials.js         공통 메뉴 · 드로어 · 브레드크럼 · 헤더 밴드 · 푸터 · toast · Supabase 클라이언트 · 헬퍼
    anchor.js           AI 앵커 카드 렌더러 window.renderAnchor(el, opts)
    stock-events.js/.css  종목 이벤트 모듈 (Research 기관)
    theme-rotation.js   테마 버블 + 패널 모듈 (Research WM · Quant Studio)
    events-data.js      행사 데이터 (CATS · EVENTS · TODAY)
    orbit-books.js/.css 행사 카테고리 책 공전 모듈 (Events · Home)
    saved-research.js   저장한 리서치 (localStorage)
    cardnews/cardnews.js/.css  카드뉴스 deck → 1080×1350 슬라이드 렌더러
    lounge-proto.js     페르소나 · 시연 데이터 (IL 전역)
    lounge-api.js       서버 API 래퍼 (ILAPI 전역, 서버 없으면 정적 스냅샷)
    home.css home.js home-feed.js entry.css entry.js login.js
    fonts/ reports/(업종 사진) eugene-logo.png
  lounge_api/           (선택) Python API 서버
  db_loader/            (선택) 데이터 적재 파이프라인 · 비밀 파일은 여기 .env
```

## 6. 문구 규칙

- 안내 · 설명 문장은 **해요체**(~해요, ~돼요, ~해주세요, ~이에요/예요). 제목 · 버튼 · 필터는 짧은 명사형. 격식체(~습니다)와 섞지 않는다.
- 투자 권유로 읽히는 표현 금지. 푸터 유의문(모든 페이지): "이 화면의 리포트·수치·백테스트 결과는 정보 제공을 위한 자료이며, 투자를 권유하는 내용은 아니에요. 과거의 성과가 미래의 수익을 보장하지는 않아요. 금융투자상품은 원금 손실이 발생할 수 있어요. 투자에 대한 최종 판단과 책임은 투자자 본인에게 있어요. © 2026 Yujin Investment & Securities Co., Ltd. · 리서치센터"

## 7. 화면 명세

### 7-1. 공통 chrome (`partials.js`)
- 상단 메뉴: 왼쪽 로고(유진투자증권 | Insight Lab) · 메뉴 pill(현재 메뉴 파란 pill) / 오른쪽 **Private Desk** 텍스트 링크 · 이름 버튼(아바타 이니셜 + "안지선님") · 로그아웃. 이름 버튼과 Private Desk는 둘 다 `desk.html`로 간다. **드롭다운 · 하위 페이지 목록 없음.**
- 메뉴: 기관 `Home · Events · Research · Quant Studio` / WM `Home · Events · Research`
- 모바일 드로어: 같은 메뉴 + Private Desk + 로그아웃
- 브레드크럼 `‹ Home › 현재`(`<body data-no-crumb>`이면 생략), 헤더 밴드(`<body data-page-eyebrow data-page-title data-page-desc>`가 있으면 eyebrow · 큰 제목 · 설명 · "홈으로 ↩")
- 헬퍼 전역: `$ $$ fmt sign dirCls noDec toast soon sb getUser onAuth openAuth signOut wireTabsA11y`
- `gate.js`: 세션 없거나 `status!=='approved'`면 지금 주소를 `sessionStorage['il.return']`에 담고 `index.html?start=1`로.

### 7-2. 진입 `index.html`
1. 브랜드 쇼릴: 풀스크린 다크 배경 + 영상(없으면 그라데이션 웨이브) + 카피 "시장의 내일을 먼저 읽는 곳,<br><em>유진 Insight Lab</em>" + 시작 버튼
2. "어떤 고객이신가요?" — 법인 / WM 두 카드
3. 법인: "소속을 알려 주세요" — 라디오 4개(자산운용사: 펀드·일임 운용역, 리서치 담당 / 투자자문·일임사: 고객 설명자료가 필요한 자문 인력 / DMA 이용 전문투자자: DMA 주문·수수료 상담 연결 / 기타 기관: 연기금·보험·은행·공제회) + 소속 · 이름. WM: 지점 + 초대 코드 + 이름.
4. 로그인: Google · 이메일(Supabase Auth) · **시연으로 둘러보기**(바로 approved 세션)
5. 승인 대기 화면("소속 확인 중입니다", `?demo_status=pending|rejected`로 확인 가능) → 승인이면 `il.return` 또는 `home.html`
- 하단 작은 링크 "리서치센터 직원이신가요? 관리자 로그인 →"(`admin.html`)

### 7-3. Home `home.html` (`<body data-no-crumb data-nav="dark">`)
1. **AI 리서치 어시스턴트 Hero**(다크, 화면 높이): Jarvis 홀로그램 iframe이 무대 전체(없으면 CSS 동심원 오브). 하단 버튼 "채팅으로 질문하기" → 가운데 채팅창(입력 · 마이크 · 검수된 질문 프리셋), 왼쪽 "검수 완료 질문" 목록, 답변은 홀로그램 위 오버레이 카드(근거 리포트 인용 칩). "유리 호출 켜기"(Web Speech로 '유리야' 감지). 서버 없으면 프리셋 답변만.
2. **유진 Event**: Orbit Books(7-6과 같은 모듈, 6권) — 가운데 "Event." 글자, 궤도 링, 책이 공전. 책 클릭 → 정면으로 와서 왼쪽으로 비켜서며 표지가 열리고 오른쪽에 카테고리 상세 · 다가오는 일정. 아래 카테고리 탭(‹ ›).
3. **AI 앵커 섹션**(다크): 왼쪽 "매일 아침, AI 앵커가 먼저 읽어드립니다." + 3단계 목록(오늘의 시황 브리핑 / 발간 리포트 브리핑 / 해외 오버나이트), 오른쪽 여성 앵커 카드(`ai_briefings` kind='market' 영상).
4. **카드뉴스 스크롤 이펙트**("수많은 리포트, 한 장의 카드로."): sticky 무대에서 스크롤에 따라 휴대폰 목업 카드 넘김 → 협업 커서(애널리스트 · AI 요약 · 에디터 · 컴플라이언스) → 데스크 아카이브 4장(최신 `reports` 4건, 클릭 시 원문). 태그 링크 → `desk.html#cardnews`.
5. 고객 유형별: 기관 = "읽는 투자에서, 설계하는 투자로." 퀀트 전환(수익 곡선이 그려지고 원형 마스크가 열리며 "퀀트 스튜디오 열기") / WM = 테마 버블(7-4 모듈).
6. 이어서 보기: 최근 질문 · 신청한 행사(→ `desk.html#events`).

### 7-4. Research `market.html` — 시황 중심 (기관 · WM 공통)
헤더 밴드: eyebrow "RESEARCH · DAILY MARKET", 제목 "Research".
- **국내 / 해외 전환 바**: 헤더 바로 아래, 상단 메뉴 밑에 sticky(메뉴 높이를 재서 `top` 지정). 회색 트랙 안에서 흰 pill이 0.32초로 미끄러짐. 버튼 "국내 KOSPI · KOSDAQ" / "해외 미국 · 아시아", 오른쪽에 "국내 · 2026.10.28 종가 기준". 상태 하나(`REGION`)를 아래 모든 영역이 공유, 바뀐 영역은 fade-up으로 등장. `?region=global` 주소 유지. **국내 · 해외 데이터를 한 화면에 섞지 않는다.**
1. **AI 앵커 + 시황**
   - 앵커: 세로 카드(폭 340px, 4:5) + 오른쪽 챕터 카드. 국내 챕터 = ① KOSPI 값(등락) / KOSDAQ ② 투자자별 순매수 ③ 업종 흐름(강세 1위 · 약세 1위) ④ 환율. 해외 챕터 = 밤사이 지수 행들 + 요약 제목. **해외 앵커 영상이 없으면 영상 URL을 비우고(재생 시 '곧 제공' 토스트) 챕터만** — 영상을 지어내지 않는다.
   - 국내 아래: 3열 — AI 데일리 요약 · 애널리스트 코멘트 · 투자자별 순매수 표(외국인/기관/개인 × KOSPI/KOSDAQ, 억). 그 아래 접이식 "데일리 아카이브"(최근 8일, 누르면 그날 시황으로 전체 갱신).
   - 해외 아래: 2열 — 밤사이 요약(제목 · 본문 · 지수 칩) · 미국 지수 목록(나스닥 · S&P 500 · 다우 · 러셀 2000). 요약이 4일 넘게 오래됐으면 예시로 취급.
2. **주요 지수**(다크 네이비 스트립, 흰 숫자, 상승 #fa5a6e / 하락 #6e8fd6): 국내 KOSPI · KOSDAQ · USD/KRW / 해외 3그룹 — 미국(IXIC 나스닥 · GSPC S&P 500 · DJI 다우 · RUT 러셀 2000) · 아시아(N225 닛케이 · HSI 항셍 · SSEC 상해종합) · 매크로(VIX · TNX 미 10년물 %p · DXY 달러 인덱스)
3. **업종 히트맵**: 국내 = strong_sectors + weak_sectors를 |등락| 큰 순으로 4열 타일(빨강/네이비, 15% 이상이면 최대 채도, 진하면 흰 글씨) / 해외 = `global_sectors` kind='sector' 11개 S&P 섹터 ETF 타일(이름 · 심볼 · 등락) + 1일 · 1주 · 1개월 탭(최대 채도 기준 2.5% · 5% · 10%), "미국 S&P 500 섹터 ETF 기준".
4. 고객 유형별 (`data-for="inst"|"wm"` 섹션 중 안 쓰는 쪽을 스크립트 실행 전에 DOM에서 제거)
   - **기관 = 종목 이벤트**(`stock-events.js`, 회색 배경 섹션 "EVENT-DRIVEN · 종목 이벤트"). 페이지가 `StockEvents.setRegion(REGION)`으로 국내/해외를 맞춘다(모듈 자체 스위치 없음).
     - 국내: 탭(코퍼레이트 액션 · 어닝 서프라이즈) → 필터 칩(시장 · 유형/업종 · 기간 전체/최근 7일/30일) → 통계(총 n건 · 긍정 · 부정) → 표(종목+신호점 · 유형 배지 · 공시 내용 · 기준일 · 효과 배지 · ›). 행 클릭 → 모달(종목명 · 코드 · 이벤트 후 8일 주가 반응 SVG 곡선(티커 시드 의사난수, "예시 반응 곡선" 고지) · 같은 종목 이벤트 이력 타임라인 · "이 종목 알림" · "관련 리포트 →"). 아래 "다가오는 이벤트 캘린더"(D-day 목록) + "이벤트 알림 등록" 카드(로그인 필요, `subscriptions` upsert).
     - 해외: 탭(실적 결과 · 발표 일정) → 섹터 칩 → 결과 표(티커 · 섹터 · 발표일 · EPS 실제/컨센 · 서프라이즈 %) **15개 먼저, "전체 n종목 보기"** / 일정은 날짜별 pill. 클릭 → 모달(AI 실적 요약 문장 · 표 · 컨콜 요약 bullet).
   - **WM = 테마 로테이션 확대**(`theme-rotation.js` wide, "THEME ROTATION · 지금 돈이 몰리는 테마"): 7-5와 같은 모듈, 버블 영역 높이 clamp(460px, 58vh, 600px), 패널 넓게.
- 이 화면에 **넣지 않는 것**: 수급 몰린 종목 표, 남성 리포트 앵커, AI 리서치 검색창.

### 7-5. 테마 로테이션 모듈 (`theme-rotation.js`)
`ThemeRotation.mount(host, {wide, onStrategy(name), strategyLabel})`
- 왼쪽 버블 영역 + 오른쪽 패널(`.theme-split` 1.25fr / .85fr, wide는 1.45fr / .9fr), 아래 범례("버블 크기 = 1개월 수익률 · 색 = 테마 구분").
- **버블 배치 알고리즘**: 지름 ∝ 1개월 수익률 상대값(0.45~1) · 전체 면적이 영역의 약 46% · DB의 pos_x/pos_y(%)를 영역 10~90%로 펴서 시작점 → 원끼리 겹치면 서로 밀어내기를 최대 400회 반복(간격 6px) · 영역 밖으로 안 나가게 clamp. 파스텔 8색 순환. hover 툴팁(자금 집중도 · 1개월 수익률), 클릭 시 선택 테두리 + 패널 갱신. 리사이즈 시 150ms 디바운스 재배치.
- 패널: 테마명 · 상태 설명(Leadership 주도 / Acceleration 가속 / Emerging 부상 / Crowded 과열 주의 / Cooling 둔화 / Reversal 반전 시도) · 배지(상태 · 1M 수익률 · 집중도) · 탭 3개 — **종목·전일**(theme_constituents ret_1d 내림차순 12~16개) / **리포트**(테마 이름 토큰이 제목 · 업종 · 종목에 들어간 reports 6건) / **뉴스**(theme_news, 첫 기사 summary를 'AI 요약' 박스로) · `onStrategy`가 있으면 하단 "이 테마로 전략 만들기 →" 버튼.
- 기본값(예시): AI 반도체 9.4/+14.2, 전력기기 6.1/+11.0, 2차전지 7.0/-3.2, 바이오 4.4/+6.8, 방산 3.6/+8.1, 엔터 2.8/+4.0, 조선 3.2/+9.5, 금융/배당 5.2/+2.1, 로봇 2.4/-1.5 (집중도/1개월%)

### 7-6. Events `conferences.html`
헤더: eyebrow "CORPORATE ACCESS", 제목 "세미나·컨퍼런스", 설명 "Corporate Day부터 WM 세미나까지 — 책을 골라 카테고리를 살펴보고, 아래 캘린더·목록에서 일정을 찾아 신청해주세요."
- 상단 탭: **기업행사/컨퍼런스 · 세미나/탐방 요청 · 외부 행사** + 오른쪽 "내 신청·문의 n" 버튼(기록 목록 패널 · 삭제)
- **기업행사/컨퍼런스**
  - 배너 카드: 왼쪽 "EUGENE INSIGHT LAB / LIVE ACCESS" · 큰 제목 **"Conferences"** · 설명 "현재 신청 가능/진행 예정 중인 행사를 확인해주세요" · "SIX WAYS TO CONNECT" / 오른쪽 **Orbit Books 6권**(Corporate Day · IPO · Earnings Call · NDR · AI Conference · WM Seminar) — 가운데 "Insight." 구, 타원 궤도 2개, 책이 3D 원근으로 공전(뒤쪽은 작고 흐림), "Ⅱ 공전 멈추기" 토글. 책 클릭 → 앞으로 와서 표지가 열리고 "아래 일정 목록이 이 카테고리로 정리돼요", 아래 목록 필터가 그 카테고리로.
  - 책 표지: 카테고리 색(7-6 표), 상단 작은 영문(QUARTERLY · IR 등), 큰 이니셜(Q. / I. / E. / N. / AI / W.), 하단 영문 foot, 번호.
  - 배너 아래: "6개 카테고리 · 예정 n건", "책을 골라 행사 카테고리를 펼쳐보세요", "지금 신청 가능한 행사 n건 · 아래 캘린더·목록에서 전체 일정을 바로 확인할 수 있어요.", "전체 일정 보기 →"
  - 일정: 예정 / 지난 토글 · 필터 칩 **전체 / 콥데이 / NDR / IPO / Conference / WM특화세미나**(Earnings Call은 필터에서만 제외 — 행사는 '전체'와 책에서 보임) · 참여 대상 · 목록 ↔ 월 캘린더. 비었을 때 "조건에 맞는 일정이 없어요." / "선택한 조건에 맞는 일정이 없는 달이에요. ‹ › 로 다른 달을 확인해주세요."
  - 행사 상세 → 신청 모달 4단계: 시연 확인 체크("실제 접수·전송이 없는 시연 화면임을 확인했어요. 테스트 값으로 입력해주세요.") → 입력(이름 · 소속 · 이메일 · 사전 질문, 자격 확인 체크) → 내용 확인 → 완료("‘내 신청·문의’와 일정 목록의 신청 상태에 바로 반영했어요. 실제 접수·이메일 발송은 일어나지 않았어요."). NDR은 "NDR 참여 문의"(초청 기반 안내), 미확정 일정은 관심 등록.
  - 기록 저장: `localStorage['il-conf-records-v1']` = `[{id, kind:'apply'|'request', type, title, eventId, at(ISO), email}]`
- **세미나/탐방 요청**: 제목 "섹터별/애널리스트별 세미나 신청", 설명 "유리가 요청 내용을 확인하고, 이메일로 일정 조율을 안내해 드려요. 애널리스트 일정에 따라 희망 날짜와 실제 진행 가능한 날짜가 다를 수 있어요." 단계 01 세미나 요청 신청 · 02 애널리스트에게 전달 · 03 일정 조율·확정. FAQ 4개(애널리스트를 몰라도? / 바로 확정되나요? / 행사 참가 신청과 차이 / 실적발표 문의). 오른쪽 폼(섹터로 선택 | 애널리스트로 선택 · 희망 주제 · 희망 날짜 · 연락처) + 안내 박스 "유리를 통한 일정 조율 안내".
- **외부 행사**: "관심사에 맞는 외부 행사" + 카드 3개(산업·테마 세미나 / 기업 인사이트 세션 / 연사 초청·행사 협업, 각 "주선 문의 →") + "새로운 행사 제안 및 문의 — 희망하는 세미나를 제안해주세요!" 폼.

### 7-7. Quant Studio `quant.html` (기관 전용, WM은 메뉴 없음 · 테마 섹션 제거)
헤더: "QUANT STUDIO · Quant Studio", 설명 "지금 돈이 몰리는 테마를 확인하고, 그 테마로 나만의 전략을 설계해 10년 데이터로 검증까지. 코드 한 줄 없이."
- 탭 ① **전략 만들기**(다이렉트 인덱싱): 테마 칩(구성 종목 3개 이상, 이번 주 버블 테마 먼저, 시총 순, 최대 15개) → 종목별 비중 슬라이더(합이 항상 100%로 정규화) → 예상 CAGR · 변동성 · 배당 · MDD · 종목 고유 수익 카드 → 저장
- ② **백테스트**: 팩터 체크(모멘텀 · 밸류 · 퀄리티 · 저변동성 · 배당 · 수급 등, `quant_factor_meta`) · 기간 · 리밸런싱 · 거래비용 → 월 수익(`quant_factor_returns`) 동일가중 결합 → 누적 곡선 SVG(전략 vs 벤치마크) · CAGR · MDD · 샤프 · 연도별 성과 바 · 초과성과 배너 · "상세 성과 리포트"(`quant_tearsheets` HTML을 iframe 모달)
- ③ **내 전략 보관함**: 로그인 필요, `saved_strategies`
- **테마 로테이션**(7-5 모듈) + "이 테마로 전략 만들기" → ①탭으로 전환 · 그 테마 선택 · 스크롤 · 토스트. 전략 목록에 없는 테마면 안내 토스트.
- 추천 전략 템플릿 3열 갤러리, 하단 크로스링크(테마 로테이션 · 리포트 · 종목 이벤트 → `market.html#stock-events`)

### 7-8. Private Desk `desk.html` (기관 · WM 공통, 하나의 정돈된 대시보드)
1. **인사 헤더**: 아바타 이니셜 · "PRIVATE DESK" · "○○님의 Private Desk" · 배지(기관 고객/WM 고객) · 유형 · 소속 · 승인 상태 · 시연 모드 / 오른쪽 요약 카드 3개(새 카드뉴스 · 7일, 저장한 리서치, 신청한 행사 — 누르면 해당 섹션)
2. **리서치 워크스페이스** "○○님의 리서치 워크스페이스": 2열(1.55fr / 1fr)
   - 왼쪽: 오늘의 맞춤 브리핑(관심 분야 태그 + 제목 + 설명 + 변경점 + "리포트 보기") · 맞춤 자료함(기본 형식 표시, 2열 자료 카드: 회의용 브리핑 / 고객 설명자료 / 카드뉴스 / AI 앵커 영상 — 서버 export가 있으면 실제 파일, 없으면 예시 + 미리보기 토스트)
   - 오른쪽: 상담 · 담당자(진행 중 상담 카드 + 네이비 "○○ 연결 · 상담 요청" 박스 → 모달: 상담 종류 · 전달 맥락(이름 · 소속 · 관심 분야) · 메모) · 관심 종목 · 테마(태그 × 삭제 · + 추가) + 알림 토글 3개(새 리포트·관심 테마 / 신청한 행사 일정 / 새 카드뉴스, `localStorage['il.prefs']`)
3. **카드뉴스** "오늘의 리서치, 카드 한 장으로": 탭(추천 · 시황·전략 · 산업·테마 · 기업 리포트 — category 투자전략 → 시황, 기업분석 → 기업, 나머지 → 산업), 카드 3장(첫 슬라이드 썸네일 + 북마크) + "카드뉴스 전체 보기 →". 카드 클릭 → 모달 뷰어(왼쪽 슬라이드 · ← → · 점 · 스와이프 / 오른쪽 카테고리 · 제목 · 팀·애널리스트 · 발간일 · 목차 · "나의 리서치에 저장" · "원문 리포트 보기 →"). `desk.html?cn=<id>`로 바로 열림.
4. 하단 2열: **나의 리서치**(탭 저장한 리서치 · 받은 자료, 카테고리 칩, 5개 + 전체 보기, 북마크로 저장 취소) | **내 이벤트 신청 내역**(탭 다가오는 행사 · 지난 행사, 행 = 날짜 · 요일 · 행사명 · 분류 · 담당 · 상태 배지, 행 클릭 → 상세 모달: 행사 일시 · 행사 장소 · 신청 상태 · 신청 구분 · 신청일 · 분류 · 담당 · 소개 + "행사 페이지에서 보기" + "신청 취소"(기록 삭제) + "신청 내용 수정은 아직 지원하지 않습니다. 바꾸려면 취소한 뒤 Events에서 다시 신청해 주세요.")
- 저장한 리서치: `localStorage['il.saved-research-v1']` = `[{kind:'report'|'cardnews', id, title, category, date, at}]`, `ILSaved.toggle/has/list/remove/onChange`

### 7-9. 보조 페이지
- `reports.html`: 왼쪽 필터(종류 전체/매크로/산업/기업 · 섹터 · 애널리스트 · 투자의견 · 기간) + 상단 검색 · 정렬 + 표(발간일 · 분류 · 리포트 · 종목 · 투자의견 · 목표주가). 행 → 상세 모달(요약 · 원문 PDF · 저장). `?id=`로 바로 열기. **앵커 · 카드뉴스는 이 페이지에 두지 않는다.**
- `global.html`: 해외 지수 그룹 · 모닝 브리핑 · 섹터·테마 히트맵 · 20일 신고가 · ATH 스크리너(전환 후보 = 20일 신고가이면서 52주 고가 대비 -15% 이하) · AI Deep Research 모달 · 이번 주 실적 띠
- `cardnews.html`: deck 단독 뷰어, `?export=1`이면 슬라이드를 세로로 나열(PNG 캡처용)
- `admin.html`: 검수 대기 · 재검토 필요 · 운영 지표 · 효과 측정 (서버 필요)

## 8. 서버 API (`lounge_api`, 선택)
`GET /api/health` · `GET /api/questions?persona=` · `GET /api/questions/<id>` · `POST /api/ask` · `POST /api/jarvis`(유진 리포트 원문 근거 우선, 인용 · 페이지 포함) · `POST /api/jarvis/web`(근거 부족일 때만 외부 웹, '유진 검수 아님' 표시) · `GET /api/exports?persona=` · `POST /api/export`(브리핑 PDF · 설명자료 PDF · 카드뉴스 PNG) · `POST /api/consults` · `POST /api/events/apply` · `POST /api/feedback` · `/api/admin/queue|review|stale|metrics|library|consults|new-report` · `/api/measure/*`.
클라이언트(`lounge-api.js`)는 `ILAPI.ready()`로 서버 확인 → 없으면 `assets/lounge-snapshot.json` 정적 스냅샷(검수된 답변만)으로 동작.

## 9. 데이터 (Supabase)

**불러오기 패턴(모든 페이지 공통)**: 코드 기본값으로 먼저 그림 → `Promise.all`로 조회(각각 `.catch(()=>({data:null}))`) → 값이 있으면 덮어써서 다시 그림 → 실패해도 화면 유지 · 콘솔 경고만.

새 Supabase 프로젝트라면 아래로 테이블을 만들고 RLS를 켠 뒤 `select`는 anon 허용, `saved_strategies`·`subscriptions`·`lounge_members`는 `auth.uid() = user_id`만 허용한다.

```sql
create table market_snapshot (snapshot_date date primary key, kospi text, kospi_chg text, kosdaq text, kosdaq_chg text,
  usdkrw text, usdkrw_chg text, foreign_net text, inst_net text, retail_net text,
  strong_sectors jsonb, weak_sectors jsonb,      -- [{name, chg:'+9.02%'}]
  flows jsonb,                                   -- {kospi:{foreign,inst,retail}, kosdaq:{...}} 값 예 '+7,790억'
  ai_summary text, created_at timestamptz default now());
create table ai_briefings (kind text, brief_date date, title text, caption text, script text, video_url text,
  thumbnail_url text, duration int, chapters jsonb, updated_at timestamptz, primary key(kind, brief_date)); -- kind: market | reports
create table global_indices (symbol text primary key, name text, price numeric, change_pct numeric, as_of text, updated_at timestamptz);
create table global_research (id bigserial primary key, kind text, title text, badge text, created_at timestamptz default now(),
  body jsonb);  -- overnight: {asof, note, rows:[{name,chg}]} · callsummary: {points:[...]} (티커가 필요하면 ticker text 컬럼 추가)
create table global_sectors (symbol text primary key, name text, kind text, chg_1d numeric, chg_1w numeric, chg_1m numeric,
  price numeric, asof text, updated_at timestamptz);   -- kind: sector | theme
create table global_highs (ticker text primary key, name text, sector text, close numeric, chg_pct numeric, vol_ratio numeric,
  is_20d bool, is_ath bool, from_52w_high numeric, ath_streak int, ma20_gap numeric, next_earnings date, spark jsonb, asof text, updated_at timestamptz);
create table global_quotes (ticker text primary key, name text, sector text, next_earnings_date date, last_earnings_date date,
  eps numeric, eps_estimate numeric, eps_surprise numeric, updated_at timestamptz);
create table global_deep_research (ticker text primary key, asof text, thesis text, drivers jsonb, risks jsonb, checkpoints jsonb,
  metrics jsonb, sources jsonb, model text, updated_at timestamptz);
create table themes (id bigserial primary key, name text, concentration numeric, ret_1m numeric, state text,
  pos_x numeric, pos_y numeric, week_of date, created_at timestamptz default now());
create table theme_constituents (id bigserial primary key, theme_name text, stock_name text, stock_code text, ret_1d numeric, ret_1w numeric, week_of date, created_at timestamptz default now());
create table theme_news (id bigserial primary key, theme_name text, title text, url text, source text, pub_date text, summary text, rank int, created_at timestamptz default now());
create table theme_signals (id bigserial primary key, side text, rank int, name text, themes text, n_themes int, balance_change text, ret_1w numeric, week_of date, created_at timestamptz default now());
create table reports (id bigserial primary key, kind text, category text, risk text, tone text, title text, summary text,
  company text, rating text, target_price text, analyst text, published_at date, url text, created_at timestamptz default now()); -- kind: macro|sector|company
create table card_news (id bigserial primary key, report_id bigint, report_url text, title text, category text, analyst text, team text,
  published_at date, deck jsonb, created_at timestamptz default now(), updated_at timestamptz);
create table events (id bigserial primary key, kind text, ticker text, name text, sector text, detail text, consensus text, actual text,
  surprise text, price_move text, ref_date text, tone text, signal text, created_at timestamptz default now()); -- kind: action|earnings, tone: up|down, signal: High|Medium|Low
create table stocks (code text primary key, name text, sector text, market text, market_cap_bil numeric, fiscal_month int, shares bigint,
  kospi200 bool, kosdaq150 bool, krx300 bool, ret_1w numeric, ret_1m numeric, ret_3m numeric, ret_12m numeric, ret_ytd numeric, fwd_pe numeric, fwd_pb numeric);
create table insights (id bigserial primary key, tab text, tag text, title text, author text, role text, summary text, grad text, channel_url text, created_at timestamptz default now());
create table quant_theme_constituents (theme_name text, code text, stock_name text, source_count int, rank int, mcap_bil numeric, updated_at timestamptz);
create table quant_stock_stats (code text primary key, name text, cagr numeric, vol numeric, div numeric, mcap_bil numeric, months int, mdd numeric,
  idio_cagr numeric, idio_vol numeric, idio_share numeric, beta_mkt numeric, r2 numeric, idio_months int, updated_at timestamptz);
create table quant_factor_returns (factor_id text, month date, ret numeric, primary key(factor_id, month));
create table quant_factor_meta (factor_id text primary key, name_ko text, description text, rule text, updated_at timestamptz);
create table quant_tearsheets (key text primary key, title text, factors jsonb, period_years int, url text, cagr numeric, sharpe numeric, mdd numeric, generated_at timestamptz);
create table saved_strategies (id bigserial primary key, user_id uuid references auth.users, kind text, title text, config jsonb, metrics jsonb, created_at timestamptz default now());
create table subscriptions (user_id uuid references auth.users, channel text, channel_url text, created_at timestamptz default now(), primary key(user_id, channel));
create table lounge_members (user_id uuid primary key references auth.users, name text, role text, seg text, cust_type text, persona text,
  org text, branch text, invite_code text, status text default 'pending', created_at timestamptz default now());
```

**카드뉴스 deck JSON** (`card_news.deck` → `cardnews.js`가 1080×1350 슬라이드로 렌더, 박스 폭에 맞춰 scale)
```json
{"brand":"EUGENE","source":"자료: …","team":"투자전략","analyst":"이름","title":"…","category":"투자전략","published_at":"2026-10-27",
 "slides":[
  {"type":"cover","title":"10월 증시\n기분 좋은 출발","date":"2026.10.02 · 마감 기준","stats":[{"label":"KOSPI","value":"+1.5%","sub":"6,971.35","tone":"up"}]},
  {"type":"content","kicker":"간밤 미국 증시","title":"…","sub":"한두 문장 설명","disc":false,
   "blocks":[{"t":"change|bars|stats|hero|flows|updown|list", "...":"블록별 필드"}]}
 ]}
```
블록: `change`(전→후 값) · `bars`(items[{name,n}] 막대) · `stats`(items[{label,value,cap}]) · `hero`(큰 숫자 + cap) · `flows`(투자자별 순매수, unit) · `updown`(강세/약세 그룹) · `list`(items[{title,desc}]). 다크 네이비 배경 + 주황 그라데이션 빛, 상단 "EUGENE + 시리즈명", 하단 출처 · 애널리스트. **카드 숫자는 리포트 본문 숫자 기준**(차트 라벨을 믿지 않는다).

**행사 데이터 (`events-data.js`)**
- `TODAY` = KST 오늘(YYYY-MM-DD). `CATS` 6개:
  | id | label | ko | 표지색 | ed | mk | foot | 설명 |
  |---|---|---|---|---|---|---|---|
  | corp | Corporate Day | 콥데이 | #0b2e6b | QUARTERLY · IR | Q. | CORPORATE ACCESS | 분기마다 열리는 기업 IR. 날짜별 A/B 세션으로 상장사 경영진을 소규모로 만나요. |
  | ipo | IPO | IPO·비상장 투자 | #1b74e4 | PRIMARY MARKET | I. | ROADSHOW | 공모 기업 설명회·딜 로드쇼와 비상장기업 투자 · M&A 동향 설명회. IPO와 비상장 투자 시장을 함께 다뤄요. |
  | earnings | Earnings Call | 실적 콜 | #9e2f3b | QUARTERLY RESULTS | E. | EARNINGS | 분기 실적 발표 직후 담당 애널리스트의 리뷰 콜과 어닝 시즌 결산. |
  | ndr | NDR | NDR | #eef3fa(글자 #0b2e6b) | NON-DEAL ROADSHOW | N. | BY INVITATION | 기업 IR팀이 기관을 직접 찾아가는 1:1·소그룹 미팅. 초청 기반이며 참여는 담당자 문의로 진행해요. |
  | ai | AI Conference | AI 컨퍼런스 | #17181b | INDUSTRY OUTLOOK | AI | CONFERENCE | AI 밸류체인과 다음 해 산업 전망을 다루는 리서치센터 대형 컨퍼런스. |
  | wm | WM Seminar | WM 세미나 | #cfe6fb(글자 #0b2e6b) | WEALTH MANAGEMENT | W. | BRANCH · ONLINE | 자산배분·절세·연금 전략을 다루는 WM 고객 대상 투자 세미나. |
- 행사 객체: `{id, cat, source:'roster'|'notice'|'pattern'|(없음=예시), title, start, end?, tba?, time, place, format, analysts[], elig:['inst'|'corp'|'wm'], cond, mode:'apply'|'roster'|'tba', deadline?, cap?, seats?, intro, program?[[시간,제목,발표자]], days?, notes?, tags?}`
- **2026 리서치센터 행사내역(실데이터, `source:'roster'`, 원본 그대로 — 시간·장소·정원은 비움)**:
  01-22 포스코인터내셔널 VIP 기업설명회(corp, 황성현) · 01-22 비상장기업 투자 및 M&A 동향 설명회(ipo, 박종선) · 02-06 토큰증권(STO) 오픈 세미나(wm, 김세희) · 02-26 M&A 동향 설명회 · 03-10 AI × BIO(ai, 박종선·권해순) · 03-16~20 1분기 온라인 콥데이(corp, 리서치센터, 온라인) · 03-26 M&A 동향 설명회 · 04-23 M&A 동향 설명회 · 05-11 칸토 콜라보 세미나(ai, Jonathan Krane·백은비·양승윤·김세희) · 05-28 M&A 동향 설명회 · 06-08~11 2분기 온라인 콥데이 · 06-25 · 07-23 · 08-27 M&A 동향 설명회 · 09-07~10 2026 3분기 Corporate Day(`notice`, 온라인 · Zoom, 09:30/10:30/13:30, 날짜별 A/B 기업: 09-07 티씨케이/에코프로비엠 · 현대백화점/POSCO홀딩스 · OCI홀딩스/스튜디오드래곤, 09-08 BGF리테일/DI동일 · 인텔리안테크/롯데관광개발 · 현대오토에버/로보티즈, 09-09 두산퓨얼셀/성일하이텍 · LIG D&A/신세계 · 현대제철/한국항공우주, 09-10 유니드/씨아이에스 · DL이앤씨/LG씨엔에스 · 테스/현대위아) · 09-17 M&A 동향 설명회 · 09-18 From AI to AX: 금융권에 도입된 Agentic AI(ai, 안지선) · 10-22 M&A 동향 설명회
- **예정(`pattern`, 일정 미확정 표시)**: 11-26 M&A 동향 설명회(매월 넷째 주 목요일 패턴) · 12월 4분기 온라인 콥데이(tba)
- **예시(시연, 화면에 '예시')**: 11-05 IPO 기업설명회·2차전지 소재 A사(여의도 본사, 정원 40/잔여 9) · 11-24 IPO 딜 로드쇼·AI 반도체 설계 B사(온라인, 80/52) · 12-03 2027 AI 산업전망 컨퍼런스(여의도 컨퍼런스홀, 하이브리드, 300/142) · 11-11 2027 자산배분 전략 세미나(강남 WM센터, wm, 60/8) · 11-26 연말 절세·연금 전략 세미나(온라인, wm, 150/마감)

**기본값(Supabase가 비었을 때, 화면에 '예시')**
- 국내 시황: 2026-06-23 KOSPI 8,203.99(-9.99%) · KOSDAQ 891.50(-7.94%) · USD/KRW 1,539.1(+0.50%), 강세 통신서비스 +1.20% 등 · 약세 반도체 -14.20% 등
- 해외 지수 · 섹터 · 밤사이 요약, 종목 이벤트 5건, 해외 실적 14종목(ORCL · FDX · MU · NKE · JPM · GE · TSLA · INTC · GOOGL · MSFT · META · AAPL · AMZN · NVDA): 그럴듯한 값으로 만들되 반드시 '예시' 배지

## 10. 데이터 적재 (선택 · 사이트가 매일 갱신되려면)
`db_loader/`(Python): 리서치센터 리포트 메일(Gmail API) · KRX/KIS 시세 · yfinance 해외 지수 · DART 공시를 모아 위 테이블에 upsert하고, Claude API로 요약 · 카드뉴스 deck을 만든다. 스케줄은 Windows 작업 스케줄러(평일 아침). 비밀값은 `Eugene_AI_Project\_secrets\db_loader.env`에서 읽는다(SUPABASE_URL · SUPABASE_SERVICE_KEY · KIS_APP_KEY/SECRET · CLAUDE_API_KEY) — **git · 배포 폴더에 절대 넣지 않는다.**

## 11. 구현 단계 (단계마다 확인 후 멈춤)

1. **기반**: `app.css`(4장 토큰 · 컴포넌트) · `config.js` · `gate.js` · `partials.js`(7-1) · 빈 페이지 5개에 헤더 밴드만. 확인: 기관/WM 세션을 콘솔로 넣고 메뉴가 다르게 나오는지, 이름 클릭이 desk.html로 가는지.
2. **진입** `index.html` + `entry.js` + `login.js`(7-2). 시연 진입 → home.html.
3. **Research** `market.html` + `anchor.js` + `stock-events.js/.css` + `theme-rotation.js`(7-4, 7-5). 국내/해외 전환이 모든 영역에 한 번에 적용되는지, 기관/WM 차이.
4. **Events** `events-data.js` + `orbit-books.js/.css` + `conferences.html`(7-6). 책 공전 · 펼침 · 필터 · 신청 4단계 · 내 신청·문의.
5. **Private Desk** `desk.html` + `saved-research.js` + `cardnews/cardnews.js`(7-8). 카드뉴스 뷰어 · 저장 · 신청 상세 · 취소.
6. **Quant Studio** `quant.html`(7-7). 테마 → 전략 만들기 연결.
7. **Home** `home.html` + `home.js` · `home-feed.js` · `home.css`(7-3). Orbit Books 재사용, 카드뉴스 스크롤 이펙트, 유형별 섹션.
8. **보조 · 마감**: reports · global · cardnews · admin, 리다이렉트 4개, 390px 점검, 접근성, 콘솔 0건.
9. (선택) `lounge_api` 서버 · `jarvis` 앱 · `db_loader`. 원래 Jarvis(`codikids/jarvis-research-guide`)와 서버 배포 저장소(`codikids/eugene-insightlab-servers`)는 새 계정으로 접근할 수 없으니, **같은 새 저장소 안에 `jarvis/` · `lounge_api/` 폴더로 만들고** Render는 새 계정으로 이 저장소를 연결해 다시 띄운 뒤 `assets/config.js`의 `apiBase` · `jarvisUrl`을 새 주소로 바꾼다. 서버가 없어도 사이트는 정적 스냅샷 · 내장 대체 오브로 동작한다.

## 12. 리다이렉트 · 배포

- 리다이렉트 파일(내용은 `location.replace` + meta refresh만): `lounge.html`·`ask.html` → `market.html` / `events.html` → 기관 `market.html#stock-events`, WM `market.html`(`?region=global` 유지) / `mypage.html` → `desk.html`(#events · #research 유지)
- 배포(요청받았을 때만): **루트 `*.html` + `assets/` + `trading/`만** 담은 `dist`로 배포한다. 사이트 폴더를 통째로 올리지 않는다(PowerShell 기준, Git Bash면 cp/find로 같은 작업):
  ```powershell
  cd Eugene_AI_Project
  Remove-Item dist -Recurse -Force -ErrorAction SilentlyContinue; mkdir dist | Out-Null
  Copy-Item yujin-research-center\*.html dist\
  Copy-Item yujin-research-center\assets dist\assets -Recurse
  if (Test-Path yujin-research-center\trading) { Copy-Item yujin-research-center\trading dist\trading -Recurse }
  Get-ChildItem dist -Recurse -Include *.py,.env*,*.json -File | Where-Object { $_.Name -match '\.py$|^\.env|token|credential' } | Remove-Item
  netlify deploy --prod --dir dist --site dd1e599a-cbc4-43a1-9fab-3e28d6678c12
  ```
  배포 후 라이브에서 기관 · WM 세션으로 다시 확인하고, 배포한 커밋에 `git tag deploy-YYYYMMDD`를 남겨 push한다.
- 캐시: 공용 JS/CSS를 고치면 `?v=날짜+알파벳`을 올려 모든 페이지 링크를 갱신.

## 13. 완료 검수

- [ ] 기관 메뉴 Home·Events·Research·Quant Studio / WM 메뉴 Home·Events·Research, 둘 다 이름 옆 Private Desk
- [ ] 이름 클릭과 Private Desk 메뉴가 같은 `desk.html`, 드롭다운 없음
- [ ] Research 국내/해외 탭 하나로 앵커 챕터 · 시황 · 지수 · 히트맵 · 종목 이벤트가 함께 바뀌고 섞이지 않음
- [ ] 기관 Research = 종목 이벤트 / WM Research = 넓은 테마, 반대쪽은 없음
- [ ] 수급 몰린 종목 · 남성 리포트 앵커 · AI 리서치 검색창이 어디에도 없음
- [ ] Quant Studio "이 테마로 전략 만들기"가 전략 만들기에 반영됨
- [ ] Private Desk 워크스페이스 · 카드뉴스 뷰어 · 저장 · 이벤트 신청 상세 · 취소 동작
- [ ] Events 탭 · 배너 · 필터 문구가 7-6과 같고 배너 책 6권 유지
- [ ] 안내 문구 해요체, 예시 데이터에 '예시' 표시
- [ ] 1440 / 390에서 깨짐 · 가로 스크롤 없음, 콘솔 오류 0건, reduced-motion 대응
