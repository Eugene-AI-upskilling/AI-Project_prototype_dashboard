# -*- coding: utf-8 -*-
"""정적 배포용 스냅샷 — Netlify 처럼 API 서버가 없는 곳에서 실데이터 답변을 보여주기 위해.

  python -m lounge_api.export_static        # → assets/lounge-snapshot.json

담는 것: 질문·답변(검수 완료 + 검수 대기 초안), 인용된 리포트 쪽 원문, 최근 리포트 목록과
각 리포트의 주제어 등장 횟수(새 리포트 투입 시연용). 리포트 전체 원문은 담지 않는다.
"""
import json
import os

from . import db, measure

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "lounge-snapshot.json")


def main():
    qs = db.q("select * from questions where status in ('reviewed','pending') order by id")
    questions, cited = [], set()
    for r in qs:
        d = {k: r[k] for k in ("id", "text", "persona", "topic", "status", "route", "stale", "stale_reason",
                               "reviewer", "created_at", "reviewed_at")}
        d["draft"] = db.loads(r["draft"])
        d["answer"] = db.loads(r["answer"])
        for a in (d["draft"], d["answer"]):
            for h in (a or {}).get("hypotheses", []):
                for s in h["facts"] + [h["view"], h["counter"]]:
                    v = s.get("verify") or {}
                    if v.get("report_id"):
                        cited.add((v["report_id"], v["page"]))
        questions.append(d)

    pages = {}
    for rid, page in sorted(cited):
        p = db.q("select r.title, r.published_at, r.author, r.url, p.text from pages p join reports r on r.id=p.report_id "
                 "where p.report_id=? and p.page=?", (rid, page), one=True)
        pages[f"{rid}-{page}"] = p

    topics = sorted({q["topic"] for q in questions if q["topic"] and len(q["topic"]) >= 2})
    reports = []
    for r in db.q("select id,title,category,author,published_at,page_count,url from reports "
                  "order by published_at desc, id desc limit 80"):
        full = " ".join(p["text"] for p in db.q("select text from pages where report_id=?", (r["id"],)))
        r["topic_counts"] = {t: full.count(t) for t in topics}
        reports.append(r)

    # 맞춤 전환 결과물(검수 완료 답변) — 없으면 만들고 assets/lounge-exports/ 로 복사
    import shutil
    from . import export
    pub = os.path.join(ROOT, "assets", "lounge-exports")
    shutil.rmtree(pub, ignore_errors=True)
    exports = []
    for q in questions:
        if q["status"] != "reviewed" or not (q["answer"] or {}).get("hypotheses"):
            continue
        rows = db.q("select kind, files from exports where question_id=?", (q["id"],))
        if len(rows) < len(export.KINDS):
            export.build(q["id"])
            rows = db.q("select kind, files from exports where question_id=?", (q["id"],))
        for r in rows:
            files = []
            for src in db.loads(r["files"]) or []:
                dst = os.path.join(pub, f"q{q['id']}", os.path.basename(src))
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                shutil.copy2(os.path.join(ROOT, src), dst)
                files.append(os.path.relpath(dst, ROOT).replace(os.sep, "/"))
            if r["kind"] == "cardnews":
                shutil.copy2(os.path.join(ROOT, "lounge_api", "exports", f"q{q['id']}", "cardnews.json"),
                             os.path.join(pub, f"q{q['id']}", "cardnews.json"))
            exports.append({"question_id": q["id"], "persona": q["persona"], "text": q["text"], "kind": r["kind"], "files": files})

    m = db.q("select count(*) n from reports", one=True)["n"], db.q("select count(*) n from pages", one=True)["n"]
    snap = {"generated_at": db.now(), "reports_total": m[0], "pages_total": m[1],
            "questions": questions, "pages": pages, "reports": reports, "exports": exports,
            "measure": {"tasks": measure.tasks(),
                        "reports": db.q("select id,title,published_at from reports order by published_at desc, id desc")}}
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(snap, f, ensure_ascii=False, separators=(",", ":"))
    print(f"스냅샷: 질문 {len(questions)} · 인용 쪽 {len(pages)} · 결과물 {len(exports)} · 리포트 목록 {len(reports)} → {OUT} ({os.path.getsize(OUT)//1024}KB)")


if __name__ == "__main__":
    main()
