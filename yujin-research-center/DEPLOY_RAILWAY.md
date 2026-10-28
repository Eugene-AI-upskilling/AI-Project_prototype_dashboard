# Railway 배포 절차 (lounge_api + jarvis)

구성: 정적 사이트는 지금처럼 **Netlify**, 서버 두 개만 **Railway 한 프로젝트**에 올린다.

```
[Netlify] yujin-research-center 정적 사이트
   │ fetch(apiBase) · iframe(jarvisUrl)        ← assets/config.js 두 값
   ▼
[Railway 프로젝트]
   ├─ lounge-api  루트: yujin-research-center   python -m lounge_api.server --host 0.0.0.0   볼륨 /data
   └─ jarvis      루트: jarvis                   npm run build → npm start
```

각 서비스 루트의 `railway.json`이 빌드 · 시작 명령과 헬스체크를 정한다. 배포는 요청할 때만 진행한다.

## 사용자가 직접 할 일

1. Railway 가입 · 결제 수단 등록 (볼륨은 유료 플랜).
2. GitHub 저장소 연결. `jarvis/`가 아직 커밋되지 않았다면 먼저 커밋한다(`.env.local`은 커밋하지 않음).
3. 서비스 2개 생성: Root Directory를 각각 `yujin-research-center`, `jarvis`로 지정.
4. lounge-api 서비스에 볼륨 추가, 마운트 경로 `/data`.
5. `lounge.db`(로컬 `yujin-research-center/lounge_api/lounge.db`, 약 7MB)를 비공개로 내려받을 수 있는 주소에 올려 두고 `LOUNGE_DB_SEED_URL`에 넣는다. 첫 부팅에 한 번만 내려받는다(볼륨에 이미 있으면 건너뜀). 끝나면 주소는 지워도 된다.

## 환경변수

### lounge-api

| 이름 | 값 | 비고 |
|---|---|---|
| `ANTHROPIC_API_KEY` | (회사 키) | 필수. 코드 · 저장소에 넣지 않는다 |
| `LOUNGE_DB` | `/data/lounge.db` | 볼륨 안 DB 경로 |
| `LOUNGE_DB_SEED_URL` | (선택) lounge.db 다운로드 주소 | 첫 부팅 시드 |
| `LOUNGE_ALLOWED_ORIGINS` | `https://eugene-insightlab.netlify.app` | CORS 허용 출처(쉼표 구분) |
| `LOUNGE_RATE_PER_10MIN` | `20` | 방문자 IP당 10분 질문 수 |
| `CLAUDE_MODEL` | (선택) 기본 `claude-opus-5-5` | |
| `LOUNGE_EFFORT` | (선택) 기본 `low` | 근거형 초안 effort |

`PORT`는 Railway가 넣는다. 서버가 `PORT` · `HOST` 환경변수를 읽는다.

### jarvis

| 이름 | 값 |
|---|---|
| `ANTHROPIC_API_KEY` | (회사 키) |
| `EMBED_ALLOWED_ORIGINS` | `https://eugene-insightlab.netlify.app` (iframe 허용, 띄어쓰기 구분) |
| `NEXT_PUBLIC_ORG_NAME` | `유진투자증권 리서치센터` |
| `RATE_LIMIT_PER_10MIN` · `DAILY_RESEARCH_LIMIT` | `20` · `500` |

## 배포 후 연결

`yujin-research-center/assets/config.js`에서 두 값을 Railway 주소로 바꾸고 Netlify에 다시 배포한다.

```js
apiBase:   'https://<lounge-api>.up.railway.app',
jarvisUrl: 'https://<jarvis>.up.railway.app',
```

- 서버가 꺼져 있거나 주소가 비어 있으면: Research · Home 질문은 `assets/lounge-snapshot.json` 정적 스냅샷으로 동작하고, 홈 홀로그램은 내장 대체 화면으로 바뀐다.

## 확인 순서

1. `https://<lounge-api>/api/health` → `"ok": true, "llm": true`, `reports` 264 이상
2. `https://<jarvis>/?embed=hero` → 홀로그램 코어만 보임
3. Netlify 사이트 → 시연 로그인 → Home에서 검수된 질문 클릭 → 답변 카드 · "원문과 함께 보기"
4. 브라우저 개발자도구 Network에 CORS 오류가 없는지

## 알려진 제약

- 새 리포트 적재(`python -m lounge_api.ingest`)는 PDF 캐시가 있는 로컬에서 하고, 갱신된 `lounge.db`를 볼륨에 다시 시드하거나 이후 별도 작업으로 자동화한다.
- SQLite는 서비스 1개(인스턴스 1개) 기준이다. 여러 인스턴스로 늘리려면 Supabase(Postgres)로 옮겨야 한다.
