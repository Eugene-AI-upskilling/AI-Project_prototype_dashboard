# 카드뉴스 JSON 스키마

리포트 PDF 1건 → JSON 1개 → Supabase `card_news` 1행.
사이트 뷰어(`cardnews.html`)와 PNG 내보내기가 같은 JSON·같은 템플릿(`assets/cardnews/cardnews.js`)을 씁니다.
카드 크기는 1080×1350이며, 넘치는 블록은 렌더러가 자동으로 축소하지만 **한 장에 블록 2~4개**를 권장합니다.

## 작성 원칙
- **숫자는 리포트 본문 텍스트 기준.** 차트 라벨·축 값은 틀릴 수 있으므로 쓰지 않는다. 본문과 표가 다르면 본문을 따른다.
- 본문에 없는 내용, 전망, 투자 권유는 창작하지 않는다. 리포트의 결론은 리포트 표현 그대로 옮긴다.
- 제목은 짧고 단정하게(줄바꿈은 `\n`, 한 줄 14자 안팎). 부제·설명은 해요체.
- 상승/하락 색은 `tone`으로 지정: `"up"`(빨강) / `"down"`(파랑) / 생략(기본 잉크색).
- 6~9장. 1장은 `cover`, 마지막 장은 `"disc": true`(면책 문구 자동 삽입).

## 최상위
```json
{
  "report_url": "http://www.eugenefn.com/common/files/amail/20261002_B_lee.jy_47.pdf",
  "title": "홈 카드에 보일 제목 (20자 안팎)",
  "category": "시황 | 투자전략 | 산업분석 | 기업분석 ...",
  "analyst": "이준영",
  "team": "글로벌 매크로팀",
  "published_at": "2026-10-02",
  "brand": "EUGENE DAILY SNAPSHOT",
  "source": "자료: 코스콤, Quantiwise, 유진투자증권",
  "slides": [ ... ]
}
```

## 슬라이드
- `{"type":"cover","title":"10월의\n기분 좋은 출발","date":"2026.10.02 · 10월 1일 마감 기준","stats":[{"label":"KOSPI","value":"+1.95%","sub":"6,971.35","tone":"up"}]}`
  - `stats`는 0~2개. 기업 리포트라면 `{"label":"목표주가","value":"95,000원","sub":"투자의견 매수"}` 등.
- `{"type":"content","kicker":"간밤 미국 증시","title":"...","sub":"(선택) 한두 문장","blocks":[...], "disc":false}`

## 블록 (`blocks[]`, `t`로 구분)
| t | 필드 | 용도 |
|---|---|---|
| `change` | `label`, `from{label,value,tone}`, `to{label,value,tone}`, `note` | A → B 변화(금리 고점→종가, 실적 전년→올해) |
| `stats` | `items[{label,value,unit,cap,tone,hl}]` (2·4개 권장) | 지표 타일 2열. `hl:true`는 남색 강조 타일 |
| `hero` | `label`, `value`, `unit`, `cap` | 한 숫자를 크게 |
| `bars` | `title`, `items[{name,value,n}]`, `thick` | 막대(가로). `n`은 숫자값(막대 길이), `value`는 표시 문자열. 음수는 파랑. `thick:true`는 비교용 굵은 막대(첫 항목 강조) |
| `flows` | `title`, `unit`, `items[{name,value,n}]` | 0 기준 좌우 막대(수급 순매수/순매도) |
| `updown` | `up[{group,items[{name,value}],why}]`, `down[...]` | 강세/약세 2단 |
| `gauge` | `title`, `min`, `max`, `marks[{v,label,sub,now}]`, `cap` | 기준선 대비 현재 위치 |
| `list` | `items[{title,desc}]` | 번호 목록(체크포인트, 리스크) |
| `takeaway` | `text` (`**강조**` 지원) | 남색 결론 박스 |
| `kv` | `label`, `value`, `tone` | 한 줄 라벨-값 |
| `note` | `text` | 회색 보조 메모 한 줄 |

예시 전체: `20261002_B_lee.jy_47.json`
