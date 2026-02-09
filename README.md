# Eugene AI Project

금융 데이터 수집 및 분석 자동화 플랫폼

## 기능

| # | 스크립트 | 기능 | 상태 |
|---|----------|------|------|
| 1 | 뉴스 → 텔레그램 | 네이버 뉴스 검색 → GPT 요약 → 텔레그램 발송 | ✅ 운영중 |
| 2 | DART 잠정실적 | KIND 잠정실적 공시 수집 → 정규화 → 텔레그램 | ✅ 운영중 |
| 3 | 해외 기업 실적 | 글로벌 98개 종목 실적 발표일/EPS 추적 | ✅ 운영중 |
| 4 | 컨콜 요약 | 컨퍼런스콜 원문 → GPT 요약 → 표준 양식 | ✅ 운영중 |
| 5 | 소셜 트래커 | Instagram/TikTok 모니터링 | 🚧 준비중 |
| 6 | 웹 크롤링 | TRASS/KITA 수출입 통계 | 🚧 기획중 |

## 로컬 실행

### 1. 설치

```bash
# 저장소 클론
git clone https://github.com/your-username/eugene-ai-project.git
cd eugene-ai-project

# 가상환경 생성 (권장)
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# 패키지 설치
pip install -r requirements.txt
```

### 2. 환경변수 설정

`.env` 파일 생성:

```env
# OpenAI API
OPENAI_API=sk-your-openai-api-key

# Naver API (뉴스 검색용)
NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-client-secret

# Telegram Bot
BOT_TOKEN=your-telegram-bot-token
CHAT_ID=your-telegram-chat-id

# DART API
dart_key=your-dart-api-key
```

### 3. 대시보드 실행

```bash
streamlit run app.py
```

브라우저에서 `http://localhost:8501` 접속

### 4. 개별 스크립트 실행

```bash
# 뉴스 수집
python scripts/1_News_to_Telegram.py

# 잠정실적 수집
python scripts/2_DART_Prelim_Earnings.py --date=20260209

# 해외 실적 수집
python scripts/3_Global_Earnings.py

# 컨콜 요약
python scripts/4_Earnings_Call_Summarizer.py --file=원문.docx
```

---

## Streamlit Cloud 배포

### 1. GitHub 저장소 준비

```bash
# Git 초기화
git init
git add .
git commit -m "Initial commit"

# GitHub 저장소 생성 후 푸시
git remote add origin https://github.com/your-username/eugene-ai-project.git
git push -u origin main
```

### 2. Streamlit Cloud 배포

1. [share.streamlit.io](https://share.streamlit.io) 접속
2. GitHub 계정 연동
3. "New app" 클릭
4. 저장소 선택: `your-username/eugene-ai-project`
5. Branch: `main`
6. Main file path: `app.py`

### 3. Secrets 설정

Streamlit Cloud 앱 설정 > Secrets에 입력:

```toml
# OpenAI API
OPENAI_API = "sk-your-openai-api-key"

# Naver API
NAVER_CLIENT_ID = "your-naver-client-id"
NAVER_CLIENT_SECRET = "your-naver-client-secret"

# Telegram Bot
BOT_TOKEN = "your-telegram-bot-token"
CHAT_ID = "your-telegram-chat-id"

# DART API
DART_KEY = "your-dart-api-key"
```

### 4. 배포 완료

배포된 앱 URL: `https://your-app-name.streamlit.app`

---

## 프로젝트 구조

```
eugene-ai-project/
├── app.py                    # Streamlit 메인 앱
├── utils.py                  # 공통 유틸리티
├── requirements.txt          # 패키지 의존성
├── .env                      # 환경변수 (로컬용, Git 제외)
├── .gitignore
├── .streamlit/
│   ├── config.toml          # Streamlit 설정
│   └── secrets.toml.example # Secrets 예시
├── pages/                    # Streamlit 멀티페이지
│   ├── 1_📰_뉴스_텔레그램.py
│   ├── 2_📈_DART_잠정실적.py
│   ├── 3_🌍_해외_실적.py
│   ├── 4_🎙️_컨콜_요약.py
│   ├── 5_📱_소셜_트래커.py
│   └── 6_🌐_웹_크롤링.py
├── scripts/                  # CLI 스크립트
│   ├── 1_News_to_Telegram.py
│   ├── 2_DART_Prelim_Earnings.py
│   ├── 3_Global_Earnings.py
│   ├── 4_Earnings_Call_Summarizer.py
│   ├── 5_Social_Tracker.py
│   └── 6_Specific_Web_Crawling.py
└── output/                   # 출력 파일
    ├── global_earnings.xlsx
    ├── earnings_call_summaries/
    └── cache/
```

---

## 라이선스

Private Project
