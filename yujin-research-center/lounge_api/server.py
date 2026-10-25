# -*- coding: utf-8 -*-
"""AI 리서치 라운지 로컬 서버 — 정적 화면 + /api/* 를 한 프로세스로.

  python -m lounge_api.server            # http://127.0.0.1:8765
  python -m lounge_api.server --port 9000

Claude API 키는 서버에만 둔다(db_loader/llm.py 와 같은 방식: CLAUDE_API_KEY / ANTHROPIC_API_KEY).
"""
import argparse
import json
import os
import re
import threading
import time
import traceback
from datetime import datetime
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from . import db, qa, retrieval

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PERSONAS = {"am", "ia", "dma", "hnw"}


# ───────── 질문 · 답변 ─────────
def _summary(r, admin=False):
    d = {k: r[k] for k in ("id", "text", "persona", "topic", "status", "route", "stale", "stale_reason",
                           "reviewer", "created_at", "reviewed_at", "draft_secs", "error")}
    if r["status"] == "reviewed":
        d["answer"] = db.loads(r["answer"])
    if admin:
        d["draft"] = db.loads(r["draft"])
    return d


def _run_draft(qid):
    r = db.q("select * from questions where id=?", (qid,), one=True)
    t0 = time.time()
    try:
        out = qa.draft(r["text"], r["persona"])
        db.x("update questions set status='pending', draft=?, topic=?, route=?, draft_secs=? where id=?",
             (json.dumps(out, ensure_ascii=False), out.get("topic"), out.get("route"), round(time.time() - t0, 1), qid))
    except Exception as e:
        traceback.print_exc()
        db.x("update questions set status='error', error=? where id=?", (str(e)[:300], qid))


def ask(body):
    text = (body.get("text") or "").strip()
    persona = body.get("persona") if body.get("persona") in PERSONAS else "am"
    if not (4 <= len(text) <= 300):
        return 400, {"error": "질문은 4~300자로 입력해 주세요."}
    qid = db.x("insert into questions(text,persona,status,created_at) values(?,?, 'drafting', ?)", (text, persona, db.now()))
    threading.Thread(target=_run_draft, args=(qid,), daemon=True).start()
    return 200, {"id": qid, "status": "drafting"}


def review(body):
    """애널리스트 검수: approve(공개) · hold(보류) · route(담당자 이관) · save(수정 저장)."""
    qid, action = body.get("id"), body.get("action")
    r = db.q("select * from questions where id=?", (qid,), one=True)
    if not r or action not in ("approve", "hold", "route", "save"):
        return 400, {"error": "잘못된 요청"}
    draft = body.get("draft") or db.loads(r["draft"]) or {}
    who = body.get("reviewer") or "반도체 담당 애널리스트"
    if action == "save":
        db.x("update questions set draft=? where id=?", (json.dumps(draft, ensure_ascii=False), qid))
    elif action == "approve":
        db.x("update questions set status='reviewed', answer=?, draft=?, reviewer=?, reviewed_at=?, stale=0, stale_reason=null where id=?",
             (json.dumps(draft, ensure_ascii=False), json.dumps(draft, ensure_ascii=False), who, db.now(), qid))
    else:
        db.x("update questions set status=?, reviewer=?, reviewed_at=? where id=?",
             ("hold" if action == "hold" else "routed", who, db.now(), qid))
        if action == "route":
            to = {"pb": "담당 PB", "desk": "DMA 데스크"}.get(draft.get("route"), "법인영업 담당")
            db.x("insert into consults(persona,kind,question_id,context,state,at) values(?,?,?,?,?,?)",
                 (r["persona"], "질문 이관", qid, f"“{r['text']}” · {draft.get('route_reason','')}", f"신규 · {to}", db.now()))
    return 200, {"ok": True}


def new_report(body):
    """새 리포트 투입(시연): 검수 완료 답변 중 이 리포트와 근거가 겹치는 답변에 '재검토 필요'를 붙인다."""
    rid = body.get("report_id")
    rep = db.q("select * from reports where id=?", (rid,), one=True)
    if not rep:
        return 400, {"error": "리포트를 찾을 수 없습니다"}
    flagged = []
    pages = db.q("select text from pages where report_id=?", (rid,))
    full = " ".join(p["text"] for p in pages)
    for r in db.q("select id,text,topic,answer from questions where status='reviewed'"):
        topic = (r["topic"] or "").strip()
        if len(topic) < 2:
            continue
        n = full.count(topic)
        if topic in (rep["title"] or "") or n >= 5:
            reason = (f"새 리포트 「{rep['title']}」({rep['published_at']})가 나왔습니다. "
                      f"'{topic}'을(를) {n}회 다뤄 이 답변의 근거와 겹칩니다. 애널리스트 재검토 중입니다.")
            db.x("update questions set stale=1, stale_reason=? where id=?", (reason, r["id"]))
            flagged.append(r["id"])
    return 200, {"flagged": flagged, "report": {"id": rep["id"], "title": rep["title"], "date": rep["published_at"]}}


def metrics():
    one = lambda sql, a=(): db.q(sql, a, one=True)
    today = datetime.now().replace(hour=0, minute=0, second=0).timestamp()
    rev = db.q("select reviewed_at-created_at d from questions where status='reviewed' and reviewed_at is not null")
    fb = one("select sum(vote='up') up, count(*) n from feedback")
    return {
        "pending": one("select count(*) n from questions where status in ('drafting','pending')")["n"],
        "stale": one("select count(*) n from questions where stale=1")["n"],
        "reviewed": one("select count(*) n from questions where status='reviewed'")["n"],
        "consults_today": one("select count(*) n from consults where at>=?", (today,))["n"],
        "avg_review_hours": round(sum(r["d"] for r in rev) / len(rev) / 3600, 2) if rev else None,
        "feedback_up": fb["up"] or 0, "feedback_n": fb["n"],
        "reports": one("select count(*) n from reports")["n"],
        "pages": one("select count(*) n from pages")["n"],
    }


# ───────── HTTP ─────────
class Handler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *a):
        if "/api/" in (a[0] if a else ""):
            super().log_message(fmt, *a)

    def _json(self, code, obj):
        b = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        try:
            return json.loads(self.rfile.read(n) or b"{}")
        except ValueError:
            return {}

    def do_GET(self):
        u = urlparse(self.path)
        if not u.path.startswith("/api/"):
            return super().do_GET()
        qs = {k: v[0] for k, v in parse_qs(u.query).items()}
        p = u.path
        try:
            if p == "/api/health":
                from db_loader import llm
                return self._json(200, {"ok": True, "llm": llm.available(), "model": llm.MODEL, **metrics()})
            if p == "/api/questions":
                where, args = "", ()
                if qs.get("persona") in PERSONAS:
                    where, args = "where persona=?", (qs["persona"],)
                rows = db.q(f"select * from questions {where} order by id desc limit 50", args)
                return self._json(200, [_summary(r) for r in rows])
            m = re.fullmatch(r"/api/questions/(\d+)", p)
            if m:
                r = db.q("select * from questions where id=?", (int(m.group(1)),), one=True)
                return self._json(200, _summary(r, admin=qs.get("admin") == "1")) if r else self._json(404, {"error": "없음"})
            if p == "/api/admin/queue":
                rows = db.q("select * from questions where status in ('drafting','pending','error') or stale=1 order by stale desc, id")
                return self._json(200, [_summary(r, admin=True) for r in rows])
            if p == "/api/admin/stale":
                return self._json(200, [_summary(r) for r in db.q("select * from questions where stale=1 order by id desc")])
            if p == "/api/admin/library":
                return self._json(200, [_summary(r) for r in db.q("select * from questions where status='reviewed' order by reviewed_at desc")])
            if p == "/api/admin/consults":
                return self._json(200, db.q("select * from consults order by id desc limit 50"))
            if p == "/api/admin/metrics":
                return self._json(200, metrics())
            if p == "/api/reports":
                lim = int(qs.get("limit", 30))
                return self._json(200, db.q("select id,title,category,author,published_at,page_count,url from reports "
                                            "order by published_at desc, id desc limit ?", (lim,)))
            m = re.fullmatch(r"/api/reports/(\d+)/pages/(\d+)", p)
            if m:
                r = db.q("select r.title,r.published_at,r.author,r.url,p.text from pages p join reports r on r.id=p.report_id "
                         "where p.report_id=? and p.page=?", (int(m.group(1)), int(m.group(2))), one=True)
                return self._json(200, r) if r else self._json(404, {"error": "없음"})
            return self._json(404, {"error": "없는 API"})
        except Exception as e:
            traceback.print_exc()
            return self._json(500, {"error": str(e)})

    def do_POST(self):
        p, b = urlparse(self.path).path, self._body()
        try:
            if p == "/api/ask":
                return self._json(*ask(b))
            if p == "/api/admin/review":
                return self._json(*review(b))
            if p == "/api/admin/new-report":
                return self._json(*new_report(b))
            if p == "/api/feedback":
                db.x("insert into feedback(question_id,persona,vote,at) values(?,?,?,?)",
                     (b.get("question_id"), b.get("persona"), b.get("vote"), db.now()))
                return self._json(200, {"ok": True})
            if p == "/api/events/apply":
                db.x("insert into event_apps(event_id,persona,state,at) values(?,?,?,?)",
                     (b.get("event_id"), b.get("persona"), b.get("state") or "applied", db.now()))
                return self._json(200, {"ok": True})
            if p == "/api/consults":
                cid = db.x("insert into consults(persona,kind,question_id,context,memo,state,at) values(?,?,?,?,?,?,?)",
                           (b.get("persona"), b.get("kind"), b.get("question_id"), b.get("context"), b.get("memo"), "신규", db.now()))
                return self._json(200, {"id": cid})
            return self._json(404, {"error": "없는 API"})
        except Exception as e:
            traceback.print_exc()
            return self._json(500, {"error": str(e)})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--host", default="127.0.0.1")
    a = ap.parse_args()
    db.init()
    if not db.q("select 1 from reports limit 1"):
        from . import ingest
        ingest.main()
    retrieval.index()
    db.x("update questions set status='error', error='서버 재시작으로 중단' where status='drafting'")
    srv = ThreadingHTTPServer((a.host, a.port), partial(Handler, directory=ROOT))
    print(f"AI 리서치 라운지: http://{a.host}:{a.port}/login.html  (API /api/health)")
    srv.serve_forever()


if __name__ == "__main__":
    main()
