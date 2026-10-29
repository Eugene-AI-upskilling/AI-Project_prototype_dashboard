# demo_crawler — 시연용 데이터 수집기 (새 Supabase 계정용)

유진 Insight Lab 사이트 시연에 필요한 데이터를 **공개 소스에서 직접 수집**해 새 Supabase에 넣습니다.
회사 메일함 · 기존 파이프라인(eugene_research) · 기존 Supabase 없이 동작하고, 기본은 **최근 7일**입니다.

## 무엇을 어디서 받나

| 사이트 화면 | 테이블 | 소스 | 키 |
|---|---|---|---|
| Research · 리포트 · 카드뉴스 원문 | `reports` | 네이버 증권 리서치 공개 API — 유진투자증권(코드 63)만, 기업 · 산업 · 투자전략 · 시황 · 경제 · 채권, PDF 원문 주소 포함 (7일 약 60건) | 불필요 |
| Research 국내 시황 · 지수 · 히트맵 | `market_snapshot` | 네이버 증권 모바일 API — KOSPI · KOSDAQ · 환율 일별, 투자자별 순매수, 업종 등락 (7거래일) | 불필요 |
| Research(WM) · Quant Studio 테마 | `themes` · `theme_constituents` | 네이버 증권 테마 — 상승 8 · 하락 7개 테마, 테마별 거래대금 상위 10종목, 1주 · 1개월 수익률 | 불필요 |
| Research 해외 탭 | `global_indices` · `global_sectors` · `global_research` · `global_quotes` | yfinance — 해외 지수 10, 섹터 ETF 11 + 테마 8, 밤사이 요약, 빅테크 등 14종목 실적 | 불필요 |
| Research(기관) 종목 이벤트 | `events` | DART 전자공시 — 유상증자 · 합병 · 자사주 · 배당 · 분할 · 공급계약 · 잠정실적 (최근 7일 40건) | `dart_api_key` |
| Private Desk 카드뉴스 | `card_news` | 위 리포트 PDF를 Claude가 읽어 카드뉴스 JSON 생성 (분류별로 고르게 6건) | `claude_api_key` |

키가 없는 항목은 건너뛰고, 사이트는 그 부분만 '예시' 데이터로 보여 줍니다.

## 처음 한 번

1. **새 Supabase 프로젝트**에 테이블을 만듭니다: SQL Editor에 이 폴더의 `schema.sql`(테이블 25개 · 읽기 권한 · Storage)을 붙여 넣고 Run.
   스키마는 사이트 구현 프롬프트(`BUILD_PROMPT.md` 9장)의 SQL과 같고, `stocks.shares`는 numeric, `stocks.fiscal_month`는 text,
   `quant_theme_constituents`에는 `primary key (theme_name, code)`를 둡니다.
2. **환경변수** (PowerShell · 키는 채팅에 붙여 넣지 말고 터미널에 직접):
   ```powershell
   setx supabase_url "https://<새 프로젝트>.supabase.co"
   setx supabase_service_key "<service_role 키>"      # 관리자 키 — 사이트 코드 · git에 넣지 않기
   setx claude_api_key "<Claude API 키>"              # 선택: 카드뉴스 · 시황 요약
   setx dart_api_key "<DART 인증키>"                  # 선택: 종목 이벤트 (opendart.fss.or.kr 무료 발급)
   ```
   `setx` 뒤에는 VS Code · 터미널을 새로 열어야 값이 잡힙니다(코드는 레지스트리에서도 읽어서 바로 동작하기도 함).
3. **설치**
   ```powershell
   cd demo_crawler
   pip install -r requirements.txt
   ```

## 실행

```powershell
python run.py --dry-run            # 적재 없이 수집만 → out\*.json 으로 결과 확인 (약 1분)
python run.py                      # 최근 7일 수집 + 새 Supabase 적재 (카드뉴스 포함 약 5~10분)
python run.py --days 14            # 기간 늘리기
python run.py --only reports,market,themes   # 일부만
python run.py --cardnews 0         # 카드뉴스 생략
```
- 다시 실행해도 중복되지 않습니다(리포트 · 시황 · 해외는 덮어쓰기, 테마 · 종목 이벤트는 교체).
- 매일 갱신하려면 Windows 작업 스케줄러에 `python run.py --days 2`를 평일 오후 4시 이후로 등록하세요.

## 사이트 연결
사이트 코드에서 Supabase 주소와 **anon 키**(service_role 아님)를 새 값으로 바꿉니다:
`assets/partials.js` · `assets/login.js` · `assets/lounge-auth.js` · `assets/trading.js`

## 이 수집기가 채우지 않는 것
| 화면 | 상태 | 채우려면 |
|---|---|---|
| AI 앵커 영상 (`ai_briefings`) | 영상 없이 앵커 카드 · 챕터만 표시 | HeyGen 등으로 영상을 만들어 Storage `briefings/`에 올리고 행 추가 |
| Quant Studio 전략 데이터 (`quant_*`) | 퀀트 데이터 없음 안내 · 기본 템플릿만 | 10년 시세로 팩터 수익률을 계산하는 별도 배치(quant_lab) 필요 — 7일치 크롤링으로는 만들 수 없음 |
| 테마 뉴스 탭 (`theme_news`) | "관련 뉴스를 불러오는 중" | 네이버 검색 API 키로 테마명 뉴스 검색 추가 |
| 해외 신고가 · 딥리서치 (`global_highs` · `global_deep_research`) | 해외 증시 보조 페이지가 예시로 표시 | yfinance 52주 고가 계산 · Claude 요약 추가 |
| 리포트 애널리스트 이름 | 카드뉴스를 만든 리포트만 채워짐 | 네이버 API에 이름이 없음 (PDF에서 읽음) |

## 주의
- 공개 API · 공개 PDF를 시연 목적으로 소량(7일) 받습니다. 요청 사이에 짧은 대기를 두었고, 상업적 재배포 용도가 아닙니다.
- 카드뉴스 숫자는 리포트 **본문 문장** 기준으로만 만들도록 Claude에 지시합니다(차트 라벨 불신). 공개 전 사람이 한 번 확인하세요.
- `out/`(수집 결과 확인용)은 git에 올리지 않습니다.
