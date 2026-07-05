# 리서치 리포트 — Gmail 자동화 워크플로우

`research@eugenefn.com` 메일이 도착하면, 매일 자동으로 **PDF 링크 추출 → 다운로드 →
텍스트 파싱 → AI 요약 → 3분류 카드(reports) 적재**까지 무인 처리합니다.
웹사이트는 Supabase `reports` 에서만 읽습니다.

> ⚠️ MCP Gmail이 아니라 **Gmail API(OAuth)** 를 씁니다. (MCP는 세션 전용 + 색인 지연이 있어
> 작업 스케줄러가 직접 못 씁니다.)

---

## 전체 그림
```
[작업 스케줄러 매일 08:30]
   └─ run_gmail_reports.ps1
        └─ python -m db_loader.gmail_reports --days 2
             1) Gmail API 인증(gmail_token.json, 무인 갱신)
             2) from:research@eugenefn.com 최근 메일 검색
             3) 본문에서 PDF URL(eugenefn.com/common/files/amail/...pdf) 정규식 추출
             4) reports.url 에 이미 있는 건 스킵(증분)
             5) extract_reports: 다운로드→fitz 파싱→LLM 요약→레코드(+url/kind)
             6) supabase upsert (on_conflict=url)
   └─ 웹사이트는 Supabase reports 에서 읽음 → 카드 클릭 = 공개 PDF
```

---

## 1회 셋업 (최초 한 번만)

### A. Gmail API OAuth 자격증명 (Google Cloud Console)
1. https://console.cloud.google.com → 프로젝트 생성(예: `eugene-insight-lab`)
2. **API 및 서비스 → 라이브러리 → "Gmail API" 사용 설정**
3. **OAuth 동의 화면** 구성:
   - User Type: **외부(External)** → 앱 이름/이메일 입력 → 저장
   - **테스트 사용자**에 `anjs920820@gmail.com` 추가 (게시 안 해도 테스트 사용자면 동작)
   - 범위(Scope)는 추가 안 해도 됨(코드에서 `gmail.readonly` 요청)
4. **사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**
   - 애플리케이션 유형: **데스크톱 앱**
   - 생성 후 **JSON 다운로드** → 파일명을 **`gmail_credentials.json`** 으로
     `db_loader/gmail_credentials.json` 에 저장
5. 의존성 설치:
   ```powershell
   pip install -r db_loader\requirements.txt
   ```

### B. 최초 1회 브라우저 인증 (token 생성)
```powershell
cd "C:\Users\anjs9\OneDrive\바탕 화면\Eugene_AI_Project\yujin-research-center"
python -m db_loader.gmail_reports --days 5 --no-push    # 브라우저 열림 → 계정 허용
```
- 브라우저에서 `anjs920820@gmail.com` 로 허용하면 `db_loader/gmail_token.json` 생성
  (이후엔 refresh token으로 **무인 갱신** → 다시 인증 불필요)
- `--no-push` 라서 적재는 안 하고, 메일에서 찾은 PDF·요약 결과만 출력(검수)

### C. DB 컬럼 + url 유니크 (Supabase SQL Editor, 1회)
```sql
alter table public.reports add column if not exists url  text;
alter table public.reports add column if not exists kind text;        -- macro/sector/company
create unique index if not exists reports_url_key on public.reports(url);  -- upsert 기준
notify pgrst, 'reload schema';
```

### D. 스케줄러 등록 (1회)
```powershell
powershell -ExecutionPolicy Bypass -File db_loader\register_gmail_reports_task.ps1
```
- `EugeneInsightLab_GmailReports` 작업이 **매일 08:30** 실행됨

---

## 매일 자동 동작 (셋업 후 무인)
1. 08:30 작업 스케줄러 → `run_gmail_reports.ps1`
2. 최근 2일 `research@eugenefn.com` 메일에서 PDF URL 추출
3. **신규 URL만** 다운로드→요약→`reports` upsert (중복은 url 기준 스킵)
4. 웹사이트(eugene-insight-lab.netlify.app) 리서치 리포트가 자동 최신화
5. 로그: `db_loader/gmail_reports.log`

> 수동 1회 실행: `python -m db_loader.gmail_reports --days 2`

---

## 분류 규칙 (URL 토큰 기반)
| URL 유형 | kind | 칩 |
|---|---|---|
| `..._B_...` | macro | 매크로 |
| `..._B2010_...` 등 | sector | 산업분석 |
| `..._413630_...`(6자리) | company | 기업분석 |

작성자(한글명)·제목·요약·투자의견·목표가는 **PDF 본문에서 LLM이 추출**합니다.
(작성자/섹터 라벨 표준화가 필요하면 `maps/authors.json`, `maps/sectors.json` 사용)

---

## 보안 / 주의
- `gmail_credentials.json`, `gmail_token.json`, `.env` 는 **절대 커밋/공유 금지** (`.gitignore` 권장).
- OpenAI 요약은 `.env`(또는 환경변수) `OPENAI_API` 사용.
- 토큰이 만료/폐기되면 B단계(브라우저 인증) 1회 재수행.
