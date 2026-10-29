# 시연 데이터를 새 Supabase 계정으로 옮기기

2026-10-29에 기존 Supabase(`zvnnpwdfeaakhxklcjfk`)에서 시연에 필요한 데이터를 내려받은 폴더입니다.
기존 프로젝트에 다시 접근하지 않아도, 이 폴더만으로 새 계정의 Supabase에 같은 데이터를 넣을 수 있습니다.

## 들어 있는 것
| 경로 | 내용 |
|---|---|
| `data/*.json` | 22개 테이블 8,602행 (시황 60일 · 리포트 302 · 카드뉴스 75 · 테마 · 해외 · 종목 이벤트 · 종목 2,557 · 퀀트 통계) — `export_summary.json`에 행 수 |
| `storage/briefings/` | AI 앵커 최신 영상 · 썸네일 (시황 2개 · 리포트 2개) |
| `storage/tearsheets/` | Quant Studio 상세 성과 리포트 HTML 13개 |
| `1_schema.sql` | 테이블 · 읽기 권한(RLS) · Storage 버킷 생성 |
| `2_import.py` | 데이터 · 파일 업로드 (Python만 있으면 됨, 설치할 패키지 없음) |
| `3_after_import.sql` | 자동 번호 맞추기 · 행 수 확인 |

넣지 않은 것: 회원 · 저장한 전략 · 알림 신청(개인 데이터), 오래된 앵커 영상(최신 것만 옮김 — 이전 날짜 영상 행은 옛 주소를 그대로 가리킵니다).

## 순서 (약 15분)

1. **새 프로젝트 만들기**: supabase.com에 새 계정으로 로그인 → New project (Region: Northeast Asia (Seoul) 권장)
2. **테이블 만들기**: 왼쪽 SQL Editor → `1_schema.sql` 내용 전체 붙여 넣기 → Run
3. **키 확인**: Project Settings › API에서
   - Project URL (`https://xxxx.supabase.co`)
   - `anon` `public` key → 사이트 코드용
   - `service_role` key → **가져오기에만** 사용 (관리자 키 · 사이트 코드 · git · 메신저에 절대 넣지 않기)
4. **데이터 넣기**: 이 폴더에서 PowerShell
   ```powershell
   $env:NEW_SUPABASE_URL="https://xxxx.supabase.co"
   $env:NEW_SUPABASE_SERVICE_KEY="service_role 키"
   python 2_import.py
   ```
   테이블마다 `넣은 행/전체 행`이 나옵니다. 여러 번 실행해도 중복되지 않습니다.
5. **마무리**: SQL Editor에서 `3_after_import.sql` 실행 → 행 수가 `export_summary.json`과 같은지 확인
6. **사이트 연결**: 사이트 코드에서 옛 주소 · 키를 새 값으로 바꾸기 (VS Code 전체 찾아 바꾸기)
   - `https://zvnnpwdfeaakhxklcjfk.supabase.co` → 새 Project URL
   - 옛 anon key(`eyJhbGciOiJIUzI1NiIs…eMQPCeKWTO1HS2VSlHmx9Nc9BFC2LGqsqtqAPvUqzuc`) → 새 anon key
   - 들어 있는 파일: `assets/partials.js` · `assets/login.js` · `assets/lounge-auth.js` · `assets/trading.js`
7. **확인**: `python -m http.server 4210` → Research(시황 · 히트맵 · 종목 이벤트) · Private Desk(카드뉴스) · Quant Studio(테마 · 백테스트)에 '예시'가 아닌 실제 날짜 데이터가 보이면 성공

## 이후 데이터를 계속 갱신하려면 (크롤링)
이 폴더는 2026-10-29 시점의 고정 데이터입니다. 매일 새 시황 · 리포트를 넣으려면 데이터 적재 파이프라인(`yujin-research-center/db_loader/`)의
`.env`에서 `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`를 새 프로젝트 값으로 바꿔 실행하세요. 리포트 메일(Gmail) · KIS 시세 · Claude 요약에 쓰는 키도 새로 넣어야 합니다.
시연만 할 거라면 이 단계는 필요 없습니다.
