# db_loader — 기존 가공 데이터 → Supabase 적재

`weekly-theme-report`(주간 테마)와 `daily_report_agent`(데일리)의 **이미 가공된 산출물**을 읽어
홈페이지 Supabase 스키마(themes / events / market_snapshot) 형태로 변환·적재합니다.

## 구성
| 파일 | 역할 |
|---|---|
| `config.py` | 소스 폴더 경로 + 최신 날짜 파일 탐색 |
| `transform.py` | 값 변환(섹터 파싱, 십억원→억, MM.DD, 국면/효과 매핑) |
| `extract_themes.py` | 주간 metrics → `themes`(+ long/short 시그널) |
| `extract_events.py` | 데일리 signals → `events`(액션/어닝) |
| `extract_market.py` | 데일리 market_tone → `market_snapshot` |
| `supabase_upsert.py` | service_role 키로 적재(themes/events=교체, market=upsert) |
| `run.py` | CLI(추출·검수·적재) |
| `DATA_REQUIREMENTS.md` | 테이블별 소스/매핑/부족 데이터 정리 |

## 사용
```powershell
cd "...\Eugene_AI_Project\yujin-research-center"
pip install -r db_loader\requirements.txt

# 추출 + 검수만 (적재 안 함)
python -m db_loader.run
python -m db_loader.run --date 2026-05-26 --theme-date 2026-05-31

# 개별 모듈 확인
python -m db_loader.extract_themes
python -m db_loader.extract_market

# 적재 (.env 에 service_role 키 입력 후)
copy db_loader\.env.example db_loader\.env
python -m db_loader.run --push
```

## 자동화(다음 단계)
- Windows 작업 스케줄러로 `run.py --push`를 데일리/주간 cron 등록(기존 파이프라인 산출 직후).
- 부족 데이터(지수 레벨·환율·어닝 당일주가·해외 리서치)는 `DATA_REQUIREMENTS.md` 참고.

> `.env`(service_role 키)는 절대 커밋/공유하지 마세요.
