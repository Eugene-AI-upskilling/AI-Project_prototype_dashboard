# 새 노트북에서 Insight Lab 이어서 개발 · 배포하기

## 1. 받기
```bash
git clone https://github.com/Eugene-AI-upskilling/AI-Project_prototype_dashboard.git Eugene_AI_Project
cd Eugene_AI_Project
# 홈 화면 홀로그램(Jarvis) 앱은 별도 저장소
git clone https://github.com/codikids/jarvis-research-guide.git jarvis
```
git 대신 번들을 받았다면: `git clone Eugene_AI_Project.bundle Eugene_AI_Project`

## 2. git에 없는 파일 (zip 백업에만 있음 · 직접 옮기기)
| 파일 | 용도 |
|---|---|
| `.env`, `yujin-research-center/db_loader/.env` | Supabase · KIS · Claude 키 (데이터 적재) |
| `yujin-research-center/db_loader/gmail_token.json`, `gmail_credentials.json` | 리포트 메일 수집 |
| `jarvis/.env.local` | Jarvis 앱 키 (`ANTHROPIC_API_KEY`) |
| `yujin-research-center/assets/**/*.mp4` | AI 앵커 · 쇼릴 영상 (배포에 필요) |
| `output/**/*.mp4` | 쇼릴 렌더 결과물 |

비밀 파일은 메신저 · 메일로 보내지 말고 USB 등으로 옮기세요. Windows 사용자 환경변수 `CLAUDE_API_KEY`도 새로 설정해야 합니다.

## 3. 로컬 실행
```bash
cd yujin-research-center
python -m http.server 4210          # 사이트 → http://127.0.0.1:4210/index.html
python -m lounge_api.server         # (선택) 라운지 API 8765
cd ../jarvis && npm install && npx next dev -p 3300   # (선택) 홈 홀로그램
```
서버 주소는 `assets/config.js` 한 곳에서 바꿉니다. 운영 서버는 Render(eugene-lounge-api, eugene-jarvis).

## 4. 배포 (Netlify · site id dd1e599a-cbc4-43a1-9fab-3e28d6678c12)
폴더 통째로 올리면 토큰 파일이 공개됩니다. **루트 html + assets + trading만** 담은 폴더로 배포하세요.
```bash
npm i -g netlify-cli && netlify login
mkdir dist && cp yujin-research-center/*.html dist/ && cp -r yujin-research-center/assets yujin-research-center/trading dist/
rm -rf dist/assets/showreel-hackathon && find dist -name "*.py" -delete
netlify deploy --prod --dir dist --site dd1e599a-cbc4-43a1-9fab-3e28d6678c12
```
배포 전 `netlify api listSiteFiles --data '{"site_id":"dd1e599a-cbc4-43a1-9fab-3e28d6678c12"}'`로 라이브와 SHA1을 비교하면 무엇이 바뀌는지 확인할 수 있습니다. mp4가 빠진 상태로 배포하면 앵커 영상이 사라지니 2번의 영상 파일을 먼저 넣으세요.

## 5. 페이지 구조 (2026-10-29 기준)
- 메뉴: Home(`home.html`) · Events(`conferences.html`) · Research(`market.html`) · 기관만 Quant Studio(`quant.html`) · 이름 옆 Private Desk(`desk.html`)
- 공통 메뉴 · 하단: `assets/partials.js` / 로그인 보호: `assets/gate.js`
- 종목 이벤트 `assets/stock-events.js` · 테마 `assets/theme-rotation.js` · 행사 데이터 `assets/events-data.js`
- 옛 주소 리다이렉트: `lounge.html`, `ask.html`, `events.html`, `mypage.html`
