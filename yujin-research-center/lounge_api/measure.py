# -*- coding: utf-8 -*-
"""효과 측정(기획서 04②) — 같은 난도의 과제 2개를 참가자마다 순서·조건을 바꿔 풀게 하고
'기존 방식(리포트 목록 직접 탐색)' vs 'AI 라운지'의 탐색 시간 · 근거 정확도를 비교한다.

과제 정답은 적재된 실제 리포트의 쪽으로 정한다. 채점: 리포트 일치 50% + 쪽 일치 50%.
"""
import json
import random

from . import db

TASKS = [
    {"id": "T1", "q": "7월 초 반도체 급락을 유진 리서치는 '실적 훼손'으로 봤나요? 그 판단이 적힌 리포트와 쪽을 찾으세요.",
     "key_title": "코스피 8천·코스닥 900 동반 이탈", "key_date": "2026-07-03", "key_page": 2,
     "hint": "‘실적 훼손이 아닌 과도한 우려의 반영’"},
    {"id": "T2", "q": "7월 조정 때 코스피가 고점 대비 얼마나 빠졌다고 유진 리서치는 정리했나요? 그 수치가 적힌 리포트와 쪽을 찾으세요.",
     "key_title": "주간 증시 브리핑", "key_date": "2026-07-06", "key_page": 1,
     "hint": "‘6/19 장중 고점 9,385pt → 7/3 장중 저점 7,378pt, -21%’"},
]
# 참가자 번호에 따라 순서 · 조건을 교차 (과제와 조건이 모두 균형을 이루는 4가지 배열)
SEQUENCES = [[("T1", "legacy"), ("T2", "lounge")], [("T1", "lounge"), ("T2", "legacy")],
             [("T2", "legacy"), ("T1", "lounge")], [("T2", "lounge"), ("T1", "legacy")]]
SCHEMA = """create table if not exists trials(
  id integer primary key, participant text, persona text, task text, cond text, ord integer,
  secs real, report_id integer, page integer, evidence text, score real, sample integer default 0, created_at real);"""


def init():
    with db._lock, db.conn() as c:
        c.executescript(SCHEMA)


def tasks():
    out = []
    for t in TASKS:
        r = db.q("select id from reports where title=? and published_at=?", (t["key_title"], t["key_date"]), one=True)
        out.append({**t, "key_report": r["id"] if r else None})
    return out


def sequence(participant):
    digits = "".join(ch for ch in str(participant) if ch.isdigit())
    n = int(digits) if digits else 1
    return [{"task": t, "cond": c} for t, c in SEQUENCES[(n - 1) % 4]]


def grade(task_id, report_id, page):
    t = next(x for x in tasks() if x["id"] == task_id)
    ok_r = report_id is not None and int(report_id) == t["key_report"]
    ok_p = ok_r and page is not None and int(page) == t["key_page"]
    return 0.5 * ok_r + 0.5 * ok_p


def add(b):
    score = grade(b["task"], b.get("report_id"), b.get("page"))
    tid = db.x("insert into trials(participant,persona,task,cond,ord,secs,report_id,page,evidence,score,sample,created_at) "
               "values(?,?,?,?,?,?,?,?,?,?,?,?)",
               (b["participant"], b.get("persona"), b["task"], b["cond"], b.get("ord"), float(b["secs"]),
                b.get("report_id"), b.get("page"), b.get("evidence"), score, int(b.get("sample") or 0), db.now()))
    return {"id": tid, "score": score}


def sample(n=6):
    """시연용 예시 데이터(sample=1로 표시). 실제 측정과 섞지 않도록 화면에서 구분한다."""
    rnd = random.Random(7)
    db.x("delete from trials where sample=1")
    keys = {t["id"]: t for t in tasks()}
    for i in range(1, n + 1):
        p = f"P{i:02d}"
        for o, s in enumerate(sequence(p), 1):
            legacy = s["cond"] == "legacy"
            secs = (rnd.uniform(9, 19) if legacy else rnd.uniform(2.5, 5.5)) * 60
            right = rnd.random() < (0.6 if legacy else 0.93)
            k = keys[s["task"]]
            add({"participant": p, "task": s["task"], "cond": s["cond"], "ord": o, "secs": round(secs),
                 "report_id": k["key_report"] if right or rnd.random() < .5 else None,
                 "page": k["key_page"] if right else k["key_page"] + 1, "sample": 1})


def listing():
    return {"tasks": tasks(), "trials": db.q("select * from trials order by participant, ord")}
