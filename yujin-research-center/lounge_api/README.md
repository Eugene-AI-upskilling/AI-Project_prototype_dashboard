# AI 리서치 라운지 — 로컬 서버

해커톤 본선 시연용 로컬 서버입니다. 정적 화면(`login.html` · `lounge.html` · `ask.html` · `admin.html`)과 API를 한 프로세스로 띄웁니다.

## 실행

```powershell
cd yujin-research-center
python -m lounge_api.server          # http://127.0.0.1:8765/login.html
```

처음 실행하면 `db_loader/_cache`의 리포트 PDF를 `lounge_api/lounge.db`(SQLite)에 적재합니다. 264건 기준 30초 안팎입니다.

| 명령 | 하는 일 |
|---|---|
| `python -m lounge_api.ingest` | 캐시의 새 PDF만 추가로 적재 |
| `python -m lounge_api.ingest 파일.pdf` | 특정 PDF 적재 |
| `python -m lounge_api.seed` | 질문 · 상담 기록을 지우고 시연용 사전 생성 답변 4건을 다시 넣음 |

Claude API 키는 `db_loader/llm.py`와 같은 방식으로 찾습니다(`CLAUDE_API_KEY` 또는 `ANTHROPIC_API_KEY`, 모델 `claude-opus-5-5`). 키나 사용 한도에 문제가 있으면 새 질문은 "접수됨"으로 처리되고 담당자 연결로 안내합니다.

## 구조

| 파일 | 역할 |
|---|---|
| `db.py` | SQLite 스키마 · 헬퍼 (reports, pages, questions, feedback, event_apps, consults) |
| `ingest.py` | PDF → 리포트 메타 + 쪽별 원문 |
| `retrieval.py` | 쪽 단위 근거 검색 (글자 2-gram BM25 + 제목 가산점 + 최근 리포트 가산점) |
| `qa.py` | 근거형 답변 초안 (Claude 구조화 출력) + 인용문 원문 대조 |
| `server.py` | 정적 파일 + `/api/*` |
| `seed.py` | 사전 생성 답변(백업) — 인용문 15개 모두 실제 원문과 일치 확인 |

## 시연 흐름

1. `login.html` → 법인 · 자산운용사로 로그인 → `lounge.html`
2. `ask.html` → 반도체 답변의 출처 칩을 누르면 리포트 원문 해당 쪽이 열리고 인용 부분이 강조됨
3. `admin.html` → 검수 대기의 배당주 초안 승인 → 자문사 고객 화면에 공개
4. `admin.html#stale` → 반도체 리포트를 새 자료로 투입 → 고객 화면 반도체 답변에 '재검토 필요'
5. 다시 시연하려면 `python -m lounge_api.seed`

## 주요 API

`GET /api/health` · `GET /api/questions?persona=am` · `GET /api/questions/{id}` · `POST /api/ask {text, persona}` ·
`GET /api/reports/{id}/pages/{n}` · `GET /api/admin/queue` · `POST /api/admin/review {id, action: approve|save|hold|route, draft}` ·
`POST /api/admin/new-report {report_id}` · `GET /api/admin/metrics` · `POST /api/feedback` · `POST /api/consults` · `POST /api/events/apply`
