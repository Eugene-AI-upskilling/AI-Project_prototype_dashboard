# -*- coding: utf-8 -*-
"""시연용 사전 생성 답변(백업) 적재 — API 한도 · 장애 시에도 시연이 가능하도록.

  python -m lounge_api.seed            # 기존 질문을 지우고 시드 4건을 넣는다

인용문은 모두 적재된 실제 리포트 원문에서 그대로 옮겼고, 넣을 때 qa.verify 로 원문 대조를 다시 한다.
"""
import json
import time

from . import db, qa


def _rid(title_prefix):
    r = db.q("select id from reports where title like ?", (title_prefix + "%",), one=True)
    if not r:
        raise SystemExit(f"리포트를 찾을 수 없습니다: {title_prefix}")
    return r["id"]


def _s(text, sid, quote):
    return {"text": text, "cite": {"source_id": sid, "quote": quote}}


EMPTY = {"text": "", "cite": {"source_id": "", "quote": ""}}


def build():
    r54 = _rid("코스피 8천·코스닥 900 동반 이탈")
    r60 = db.q("select id from reports where title='주간 증시 브리핑' and published_at='2026-07-06'", one=True)["id"]
    r61 = _rid("Equity Strategy: 변동성을 이기는 비법은")
    r70 = _rid("급등락 반복하지만 같이 가야하는 반도체")
    r103 = _rid("ETF Strategy: 금리 상승기의 배당주")
    S = lambda rid, p: f"R{rid}-p{p}"

    semi = {
        "route": "answer", "route_reason": "리서치 근거로 답할 수 있는 시장 질문", "topic": "반도체",
        "verdict": "AI 수요가 꺾였다는 근거는 아직 약합니다. 당사는 7월 급락을 실적 훼손보다 과도한 우려와 수급 과열 해소로 보며, 근거 강도는 실적 모멘텀 둔화 우려 > 수급 > AI 수요 둔화 순입니다.",
        "hypotheses": [
            {"title": "가설 1 · AI 수요 둔화(AI 버블 논란)", "strength": "약함",
             "facts": [_s("메타가 남는 컴퓨팅 자원을 임대한다는 소식이 AI 버블 논란을 자극했습니다.", S(r60, 1),
                          "메타가 남는 컴퓨팅 자원을 임대할 것이라는 소식이 AI 버블 논란을 자극"),
                       _s("메타의 잉여 컴퓨팅 클라우드 사업과 애플의 중국 반도체 업체 구매 협상 소식에 반도체가 급락했습니다.", S(r54, 2),
                          "메타의 잉여 컴퓨팅 클라우드 사업 & 애플의 중국 반도체 업체 구매 협상에 반도체 급락")],
             "view": _s("당사는 이번 급락을 실적 훼손이 아닌 과도한 우려의 반영으로 판단합니다.", S(r54, 2),
                        "이번 반도체 급락은 실적 훼손이 아닌 과도한 우려의 반영"),
             "counter": _s("실적이 예상을 크게 웃돌지 못하면 모멘텀 둔화로 해석될 수 있습니다.", S(r61, 1),
                           "실적이 예상을 크게 상회하지 않으면 모멘텀 둔화로 해석될 수 있음"),
             "checks": ["7월 후반 미국 빅테크 분기 실적과 투자 계획 상향 여부", "삼성전자 2Q 잠정실적(7/7)"]},
            {"title": "가설 2 · 실적 모멘텀 둔화 우려(높아진 기대치)", "strength": "부분 유효",
             "facts": [_s("반도체 영업이익 증가율은 2Q에 정점을 찍은 뒤 하반기 400~700%대로 둔화될 전망입니다.", S(r61, 1),
                          "반도체 영업이익 증가율은 2Q 1,000%yoy 늘어난 후 하반기 400~700%yoy대로 둔화될 것으로 예상됨")],
             "view": _s("다만 절대 이익 규모로 보면 반도체를 대체할 뚜렷한 대안은 없다고 봅니다.", S(r61, 1),
                        "절대이익 규모 측면에서 반도체 외 뚜렷한 대안은 없음"),
             "counter": _s("2분기 코스피 영업이익 추정치는 오히려 계속 상향 조정되고 있습니다.", S(r70, 2),
                           "2 분기 코스피 영업이익은 지난주 대비 2 조원 가량 상향 조정되었고"),
             "checks": ["반도체 영업이익 증가율의 3Q 정점 여부", "2Q 실적이 높아진 기대치를 넘는지"]},
            {"title": "가설 3 · 수급 과열 해소(레버리지 ETF)", "strength": "단기 요인",
             "facts": [_s("코스피는 6/19 장중 고점 9,385pt에서 7/3 장중 저점 7,378pt까지 21% 하락했습니다.", S(r60, 1),
                          "코스피는 6/19일 장중 고점 9,385pt 이후 7/3일 장중 저점 7,378pt까지 -21% 하락함")],
             "view": _s("레버리지 ETF 자금 유입에 따른 수급 불안은 어느 정도 해소됐다고 봅니다.", S(r60, 1),
                        "레버리지 ETF 자금 유입에 따른 수급 불안은 어느 정도 해소된"),
             "counter": _s("가파른 상승 뒤에는 높은 변동성이 따를 수밖에 없습니다.", S(r54, 2),
                           "가파른 상승에는 높은 변동성이 따를 수밖에 없음"),
             "checks": ["실적 시즌 진입 후 변동성 안정 여부"]},
        ],
    }
    rate = {
        "route": "answer", "route_reason": "리서치 근거로 답할 수 있는 시장 질문", "topic": "배당주",
        "verdict": "당사는 최근 은행·보험 강세의 가장 중요한 배경을 금리 상승으로 봅니다. 다만 금리가 오르는 중에 금융주가 약세로 돌아서면 경계 신호로 봐야 합니다.",
        "hypotheses": [
            {"title": "관점 1 · 금리 상승 → 금융주 강세", "strength": "유효",
             "facts": [_s("은행·보험 ETF는 최근 3개월 코스피가 하락하는 동안 나란히 15% 올랐습니다.", S(r103, 2),
                          "최근 3개월 시장(KOSPI)이 하락하는 동안 나란히 +15% 상승했다")],
             "view": _s("당사는 가장 중요한 배경을 금리 상승으로 판단합니다.", S(r103, 2), "가장 중요한 배경은 ‘금리 상승’으로 판단된다"),
             "counter": _s("금리가 오르는데 금융주가 약세로 반전하면 경제·증시에 부정적 신호일 수 있습니다.", S(r103, 2),
                           "금리가 오르는 상황에서 금융주 주가가 약세로 반전할 경우"),
             "checks": ["금리 상승 중 금융주의 약세 반전 여부"]},
            {"title": "관점 2 · 고금리 국면의 퀄리티 · 배당 성장주", "strength": "부분 유효",
             "facts": [_s("매년 배당을 늘려온 종목은 실적이 안정적이고 현금 흐름이 양호한 경우가 많습니다.", S(r103, 2),
                          "매년 배당을 늘려온 종목은 이런 특성을 공유하는 경우가 많다")],
             "view": _s("금리가 높은 국면에서는 퀄리티 주식이 유리하다고 봅니다.", S(r103, 2), "금리가 높은 국면에서 “퀄리티(Quality)” 주식이 유리하다"),
             "counter": EMPTY,
             "checks": ["배당 성장 종목의 다음 분기 실적 흐름"]},
        ],
    }
    pb = {"route": "pb", "route_reason": "일반투자자의 매매 여부 문의라 적합성 확인이 필요합니다. 담당 PB에게 연결하고, 검수된 배당주 분석을 함께 안내합니다.",
          "topic": "배당주", "verdict": "매수 여부는 AI가 답하지 않습니다. 담당 PB가 고객 성향을 확인한 뒤 안내드립니다.", "hypotheses": []}
    desk = {"route": "desk", "route_reason": "DMA 수수료 · 주문 방식은 리서치가 아닌 서비스 조건 문의입니다. DMA 데스크로 연결합니다.",
            "topic": "서비스 문의", "verdict": "DMA 이용 조건은 담당 데스크가 직접 안내드립니다.", "hypotheses": []}
    return [("반도체주 하락, AI 수요 둔화 때문인가?", "am", semi, "reviewed"),
            ("금리가 오르는데 배당주·금융주는 괜찮을까?", "ia", rate, "pending"),
            ("배당주 지금 사도 되나요?", "hnw", pb, "pending"),
            ("DMA 수수료 체계가 어떻게 되나요?", "dma", desk, "pending")]


def _verify(d):
    ids = {s["cite"]["source_id"] for h in d["hypotheses"] for s in h["facts"] + [h["view"], h["counter"]] if s["text"]}
    by_id = {}
    for sid in ids:
        rid, page = sid[1:].split("-p")
        r = db.q("select r.id, r.title, r.published_at, r.url, p.text from pages p join reports r on r.id=p.report_id "
                 "where p.report_id=? and p.page=?", (int(rid), int(page)), one=True)
        by_id[sid] = {"id": sid, "report_id": r["id"], "page": int(page), "title": r["title"], "date": r["published_at"],
                      "url": r["url"], "text": r["text"]}
    ok = total = 0
    for h in d["hypotheses"]:
        for s in h["facts"] + [h["view"], h["counter"]]:
            if s["text"]:
                s["verify"] = qa.verify(s["cite"], by_id)
                total += 1
                ok += s["verify"]["status"] == "ok"
    d["meta"] = {"model": "사전 생성 답변(백업)", "secs": 0, "cite_ok": ok, "cite_total": total,
                 "sources": [{k: v[k] for k in ("id", "report_id", "page", "title", "date", "url")} for v in by_id.values()],
                 "usage": None}
    return ok, total


def main():
    db.init()
    for t in ("questions", "feedback", "event_apps", "consults", "exports"):
        db.x(f"delete from {t}")
    import os, shutil
    shutil.rmtree(os.path.join(os.path.dirname(os.path.abspath(__file__)), "exports"), ignore_errors=True)
    now = time.time()
    for i, (text, persona, d, status) in enumerate(build()):
        ok, total = _verify(d)
        created = now - (3 - i) * 3600 - (86400 * 2 if status == "reviewed" else 0)
        js = json.dumps(d, ensure_ascii=False)
        db.x("insert into questions(text,persona,topic,status,draft,answer,route,reviewer,created_at,reviewed_at,draft_secs) "
             "values(?,?,?,?,?,?,?,?,?,?,?)",
             (text, persona, d["topic"], status, js, js if status == "reviewed" else None, d["route"],
              "퀀트전략 애널리스트" if status == "reviewed" else None, created,
              created + 5400 if status == "reviewed" else None, 0))
        print(f"  {status:<9} {text}  인용 대조 {ok}/{total}")
    # 실시간(Claude)으로 생성했던 답변 초안 · 검수 답변 — seed_live.json (2026-10-27 생성, 인용 원문 대조 모두 일치)
    import os
    lp = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seed_live.json")
    if os.path.exists(lp):
        for i, r in enumerate(json.load(open(lp, encoding="utf-8"))):
            created = now - 1800 + i * 120
            db.x("insert into questions(text,persona,topic,status,draft,answer,route,reviewer,created_at,reviewed_at,draft_secs) "
                 "values(?,?,?,?,?,?,?,?,?,?,?)",
                 (r["text"], r["persona"], r["topic"], r["status"], json.dumps(r["draft"], ensure_ascii=False),
                  json.dumps(r["answer"], ensure_ascii=False) if r["answer"] else None, r["route"], r["reviewer"],
                  created, created + 900 if r["status"] == "reviewed" else None, r["draft_secs"]))
            m = r["draft"].get("meta") or {}
            print(f"  {r['status']:<9} {r['text']}  인용 대조 {m.get('cite_ok')}/{m.get('cite_total')} (실시간 생성)")
    db.x("insert into consults(persona,kind,question_id,context,state,at) values(?,?,?,?,?,?)",
         ("dma", "DMA 상담", None, "반도체 답변 열람 후 DMA 수수료 · 주문 방식 문의", "연결 완료 · DMA 데스크", now - 86400))


if __name__ == "__main__":
    main()
