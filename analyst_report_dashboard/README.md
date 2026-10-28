# 애널리스트 리포트 데스크

네이버 증권 종목분석 리포트를 모아서 요약해 보여주는 대시보드입니다. 종목명, 증권사, 애널리스트명으로 검색할 수 있고, 요약을 텔레그램으로 보낼 수 있습니다.

## 실행

```powershell
pip install requests pymupdf anthropic
python naver_reports.py            # 최근 2일치 리포트 수집·요약 → output/analyst_reports.html
python server.py                   # http://127.0.0.1:8791 (실시간 검색 + 텔레그램 전송)
```

`run_dashboard.bat`을 더블클릭해도 수집부터 서버 실행까지 한 번에 됩니다.

| 파일 | 역할 |
|---|---|
| `naver_reports.py` | 수집 → PDF 본문 → 애널리스트 추출 → 요약 → `data/reports.json` 캐시 → HTML 생성 |
| `server.py` | 로컬 서버. 네이버 실시간 검색, 요약 생성, 텔레그램 전송 API |
| `telegram_send.py` | 텔레그램 메시지 포맷과 전송 (CLI로도 사용 가능) |
| `search.py` | 종목·증권사·애널리스트 통합 검색 규칙 |
| `dashboard_template.html` | 대시보드 화면 |

## 검색

- 검색어를 입력하면 저장된 리포트에서 바로 걸러 보여줍니다.
- Enter(서버 모드)를 누르면 네이버에서 실시간으로 찾습니다. 증권사명은 `brokerCodes`, 종목명·종목코드는 `itemCodes`로 바꿔 조회하고, 그 밖의 단어는 제목·본문 검색으로 넘깁니다.
- 단어를 섞어 쓸 수 있습니다. 예: `하나 삼성E&A`
- 애널리스트 이름은 네이버 API에 없어서 PDF 첫 페이지에서 추출합니다. 그래서 수집해 둔 리포트 안에서만 찾을 수 있습니다. 유안타증권처럼 PDF에 이름이 텍스트로 들어 있지 않은 곳은 비어 있습니다.
- 결과가 한 종목으로 좁혀지면 증권사별 목표가 비교를, 한 애널리스트나 한 증권사로 좁혀지면 커버 종목 목록을 위쪽에 보여줍니다.

## 요약

- 기본 요약은 Claude가 맡습니다(`yujin-research-center/db_loader/llm.py` 재사용, 키는 `CLAUDE_API_KEY`). 한 줄 요약, 투자 포인트 3개, 리스크를 만들고 애널리스트 이름도 같이 보정합니다.
- Claude를 쓸 수 없을 때(키 없음, 사용 한도 초과, `--no-llm`)는 네이버에 올라온 증권사 요약문에서 소제목과 앞 세 문장을 뽑아 씁니다. 상세 화면 아래에 어느 쪽 요약인지 표시됩니다.
- 이미 Claude로 요약한 리포트는 다시 호출하지 않습니다. 폴백으로 요약된 건은 다음 수집 때 Claude로 다시 요약합니다.

## 텔레그램 설정

1. 텔레그램에서 @BotFather → `/newbot` → 봇 토큰을 받습니다.
2. 만든 봇에게 아무 메시지나 보냅니다. 그룹으로 받으려면 봇을 그룹에 초대한 뒤 메시지를 보냅니다.
3. 아래 순서로 설정합니다.

```powershell
setx TELEGRAM_BOT_TOKEN "123456:ABC..."
python telegram_send.py --whoami     # chat_id 확인
setx TELEGRAM_CHAT_ID "123456789"
```

설정한 뒤 서버를 다시 켜면 상단 배지가 "텔레그램 연결됨"으로 바뀝니다.

- 대시보드: 상세 화면의 **텔레그램 전송** 버튼을 누르거나, 카드를 체크한 뒤 하단 바에서 **텔레그램 전송**을 누릅니다. 메시지가 4096자를 넘으면 자동으로 나눠 보냅니다.
- CLI:

```powershell
python telegram_send.py --query 삼성전자          # 검색 결과 (기본 10건)
python telegram_send.py --today                  # 가장 최근 작성일 리포트 전체
python telegram_send.py --nid 97012 97011
python telegram_send.py --query 하나증권 --dry-run # 보내지 않고 메시지만 출력
python naver_reports.py --telegram               # 수집 직후 이번 수집분 전송
```

봇 토큰은 서버 쪽 환경변수에만 둡니다. HTML 파일에는 들어가지 않습니다. 그래서 `output/analyst_reports.html`을 파일로 직접 열었을 때는 전송 대신 **요약 복사**만 됩니다.

## 데이터 출처

- 목록: `https://stock.naver.com/api/stockSecurity/researches/v2/company` (`query`, `itemCodes`, `brokerCodes`, `startDate`/`endDate`, `index`/`size`)
- 상세: `…/company/{nid}` (PDF 주소, 직전 목표가, 작성일 주가)
- 종목코드: `https://ac.stock.naver.com/ac?q=…&target=stock`

finance.naver.com/research는 현재 stock.naver.com으로 리다이렉트됩니다. 비공개 API라 사이트가 바뀌면 깨질 수 있습니다.
