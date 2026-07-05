# 실데이터 적재 — 데이터 요구사항 정리

홈페이지 6개 콘텐츠 테이블별로 **(1) 현재 소스 (2) 매핑 (3) 부족한 데이터**를 정리합니다.
현재 `db_loader`는 ✅/🟡 표시된 항목을 자동 추출합니다. ❌ 는 다음 단계 연결 대상입니다.

---

## 1. `themes` — 테마 로테이션/버블  ✅ 연결됨
- **소스:** `weekly-theme-report / output/weekly_report/<date>/theme_weekly_metrics_<date>.xlsx`
  - `league_table` (ret_1m_pct, top5_value_traded_bn), `lifecycle` (stage, x_momentum, y_catalyst_flow)
- **매핑:** name←theme_name_kr · ret_1m←ret_1m_pct · state←stage · pos_x/pos_y←모멘텀·촉매흐름 좌표 · concentration←거래대금을 2~10로 정규화(버블 크기)
- **부족/주의:**
  - 버블 `concentration`은 표시용 정규화값(원지표는 거래대금 bn). 의미 보존하려면 별도 컬럼 추가 고려.
  - **Long/Short 시그널**(`long_signal`/`short_signal` 시트)은 추출은 되지만 **저장할 테이블이 아직 없음** → `theme_signals` 테이블 신설 필요(또는 themes에 jsonb 컬럼).

## 2. `events` — 종목 이벤트  🟡 액션 연결됨 / 어닝 보강 필요
- **소스:** `daily_report_agent / data/processed/signals_<YYYYMMDD>.csv`
- **코퍼레이트 액션 ✅:** event_category(자사주/배당/분할/유상증자/합병/상장폐지…) → kind=action, 예상효과·tone 매핑
- **어닝 서프라이즈 🟡:** `signal in (Earning Surprise/Shock)` 또는 `op_consensus_<date>.csv` 조인으로 계산. 단,
  - **부족 1 — 잠정실적 실측치:** DART 잠정실적(op_actual)이 있는 날만 생성됨. 실적시즌 외 날짜는 어닝 0건.
  - **부족 2 — 당일 주가(`price_move`):** signals에 없음 → **가격 데이터 조인 필요**(yfinance `collect_market_data` 또는 대신증권 API).
  - **부족 3 — 컨센서스 상시 공급:** `quantiwise_estimates.xlsx`를 실적 전 미리 넣어야 surprise 계산 가능.

## 3. `market_snapshot` — 오늘의 시황  🟡 부분 연결됨
- **소스:** `daily_report_agent / data/raw/market_tone_<YYYYMMDD>.csv`
- **연결 ✅:** kospi_chg/kosdaq_chg(등락률), 외국인/기관 순매수(십억원→억), 강세/약세 업종(상위 3)
- **부족(현재 None 처리, 추가 소스 필요):**
  | 항목 | 필요 데이터 | 출처 후보 |
  |---|---|---|
  | `kospi`,`kosdaq` 지수 **레벨** | 종가 (2,742.18 형태) | yfinance `^KS11`/`^KQ11` 종가, KRX |
  | `usdkrw`,`usdkrw_chg` | 원/달러 환율+등락 | yfinance `KRW=X`, 한국은행 |
  | `retail_net` 정확값 | 개인 순매수 실측 | KRX 투자자별 매매동향 (현재는 -(외국인+기관) 추정) |
  | `ai_summary` | 한 줄 AI 시황 요약 | daily 파이프라인 `telegram_summary` 또는 LLM 1회 호출 |

## 4. `reports` — 리서치 리포트  ❌ 소스 없음(이 두 폴더엔 없음)
- **필요 데이터:** 리포트 제목 · 요약 · 섹터 · 투자의견 · 목표가(또는 상승여력) · 애널리스트 · 발간일
- **출처 후보:** 리서치센터 발간 리포트(PDF/한글문서) 메타데이터, 또는 사내 리포트 DB/RSS. → 별도 파서(리포트 표지/요약 추출) 필요.

## 5. `insights` — 애널리스트 인사이트 카드  ❌ 일부 파생 가능
- **애널리스트 인사이트:** `Eugene_AI_Project` News→Telegram(애널리스트 채널 콘텐츠) 또는 직접 작성 카드.
- **시황 브리프(파생 가능 🟡):** daily `telegram_summary_<date>.txt` + market_tone → "오늘의 마켓 톤" 카드 자동 생성 가능.
- **종목 코멘트(파생 가능 🟡):** events(어닝/액션)에서 카드 생성 가능.
- **필요:** 채널 URL 매핑(섹터→텔레그램/채널), 카드 썸네일 그라데이션 규칙.

## 6. `global_research` — 해외 AI 리서치  ❌ 3번째 프로젝트 필요
- **출처:** `Eugene_AI_Project`
  - 밤사이 시황 ← `scripts/0_Global_Market_Overnight_Summary.py` / `output/global_market_summary_*.xlsx`
  - 글로벌 실적 ← `scripts/3_Global_Earnings.py` / `output/global_earnings.xlsx` (98종목)
  - 컨콜 요약 ← `scripts/4_Earnings_Call_Summarizer.py` / `output/earnings_call_summaries/`
- **필요:** 위 산출물 경로 확정 + `extract_global.py` 추가(다음 단계).

---

## 다음 단계 우선순위(권장)
1. **market_snapshot 완성** — 지수 레벨/환율/AI요약 보강(가장 눈에 띄는 첫 화면). yfinance만 붙이면 지수·환율 즉시 해결.
2. **events 어닝 + 당일주가** — 가격 데이터 조인.
3. **global_research** — Eugene_AI_Project 산출물용 `extract_global.py` 추가.
4. **reports / insights** — 리포트 메타 소스 확정 후 파서 추가, 시황 브리프 카드 자동화.
5. **theme_signals 테이블** 신설 → Long/Short 카드도 실데이터화.

## 적재 실행
```powershell
cd "...\Eugene_AI_Project\yujin-research-center"
pip install -r db_loader\requirements.txt
python -m db_loader.run                         # 최신 추출 + 검수(적재 안 함)
python -m db_loader.run --date 2026-05-26        # 특정 데일리 날짜
copy db_loader\.env.example db_loader\.env       # service_role 키 입력 후
python -m db_loader.run --push                   # Supabase 적재
```
