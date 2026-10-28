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

from . import db, measure, qa, retrieval, websearch

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PERSONAS = {"am", "ia", "dma", "hnw"}


# ───────── 질문 · 답변 ─────────
def _summary(r, admin=False):
    d = {k: r[k] for k in ("id", "text", "persona", "topic", "status", "route", "stale", "stale_reason",
                           "reviewer", "created_at", "reviewed_at", "draft_secs", "error")}
    if r["status"] == "reviewed":
        d["answer"] = db.loads(r["answer"])
    elif r["status"] == "pending" and (r["route"] or "answer") == "answer" and not admin:
        d["draft"] = db.loads(r["draft"])   # 검수 전 AI 초안 공개 — 화면에 '검수 전' 딱지 (검수되면 answer + 애널리스트 코멘트)
    w = db.q("select text,sources,created_at from web_answers where question_id=?", (r["id"],), one=True)
    if w:   # 유진 근거가 없어 외부 웹 자료로 안내한 답 (검수 대상 아님 · 화면에 별도 표시)
        d["web"] = {"text": w["text"], "sources": db.loads(w["sources"]) or [], "at": w["created_at"]}
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


# ───────── Jarvis(Home · Research 공용 진입점) — 마스터 문서 D1 ─────────
# 1차: 유진 리포트 근거(qa.draft → 애널리스트 검수). 근거가 없을 때만 2차: 외부 웹 자료(websearch, '유진 검수 아님').
# 근거 부족 판정은 검색 점수(BM25 절대값은 근거 유무를 가르지 못함 · 2026-10-28 측정) 대신
# ① 검색 결과 0건 ② 초안 모델의 route='hold'(근거 부족) 두 가지로 한다.
def _evidence(text, k=3):
    hits = retrieval.search(text, k=8)
    if not hits:
        return []
    meta = {r["id"]: r for r in db.q("select id,title,published_at,author from reports where id in (%s)"
                                       % ",".join(str(h["report_id"]) for h in hits))}
    out, seen = [], set()
    for h in hits:
        if h["report_id"] in seen:
            continue
        seen.add(h["report_id"])
        m = meta[h["report_id"]]
        out.append({"report_id": h["report_id"], "page": h["page"], "title": m["title"], "date": m["published_at"], "author": m["author"]})
        if len(out) >= k:
            break
    return out


def _web(qid, text, persona):
    w = db.q("select * from web_answers where question_id=?", (qid,), one=True)
    if not w:
        out = websearch.answer(text, persona)
        db.x("insert or replace into web_answers(question_id,text,sources,secs,created_at) values(?,?,?,?,?)",
             (qid, out["text"], json.dumps(out["sources"], ensure_ascii=False), out["secs"], db.now()))
        w = db.q("select * from web_answers where question_id=?", (qid,), one=True)
    return {"mode": "web", "id": qid, "text": w["text"], "sources": db.loads(w["sources"]) or []}


def jarvis(body):
    text = (body.get("text") or "").strip()
    persona = body.get("persona") if body.get("persona") in PERSONAS else "am"
    if not (4 <= len(text) <= 300):
        return 400, {"error": "질문은 4~300자로 입력해 주세요."}
    r = db.q("select id from questions where status='reviewed' and text=? order by reviewed_at desc limit 1", (text,), one=True)
    if r:   # 이미 검수된 같은 질문 → 검수 답변 그대로
        return 200, {"mode": "reviewed", "id": r["id"]}
    r = db.q("select id from questions where status='pending' and (route is null or route='answer') and text=? order by id desc limit 1", (text,), one=True)
    if r:   # 같은 질문의 AI 초안이 이미 있음 → 새로 만들지 않고 그 초안('검수 전')을 보여 준다
        return 200, {"mode": "eugene", "id": r["id"], "status": "pending"}
    ev = _evidence(text)
    if ev:
        code, res = ask({"text": text, "persona": persona})
        if code == 200:
            res.update(mode="eugene", evidence=ev)
        return code, res
    qid = db.x("insert into questions(text,persona,status,route,created_at) values(?,?,'hold','hold',?)", (text, persona, db.now()))
    try:
        return 200, _web(qid, text, persona)
    except Exception as e:
        traceback.print_exc()
        return 200, {"mode": "none", "id": qid, "error": f"유진 리포트에 근거가 없고, 외부 자료 안내도 만들지 못했습니다 ({str(e)[:120]}). 담당자 연결로 안내드립니다."}


def jarvis_web(body):
    r = db.q("select * from questions where id=?", (int(body.get("id") or 0),), one=True)
    if not r:
        return 404, {"error": "없음"}
    if not (r["route"] == "hold" or r["status"] == "hold"):   # 유진 근거로 답할 수 있는 질문은 웹으로 넘기지 않는다
        return 409, {"error": "유진 리포트 근거로 검수 중인 질문입니다."}
    try:
        return 200, _web(r["id"], r["text"], r["persona"])
    except Exception as e:
        traceback.print_exc()
        return 200, {"mode": "none", "id": r["id"], "error": f"외부 자료 안내를 만들지 못했습니다 ({str(e)[:120]})."}


# ───────── 호출 제한 (방문자 IP당 10분) ─────────
_RATE, _hits = int(os.environ.get("LOUNGE_RATE_PER_10MIN", "20")), {}


def _rate_ok(ip):
    now = time.time()
    q = [t for t in _hits.get(ip, []) if now - t < 600]
    if len(q) >= _RATE:
        _hits[ip] = q
        return False
    q.append(now)
    _hits[ip] = q
    return True


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
        if (draft.get("hypotheses") or []):
            threading.Thread(target=_safe_export, args=(qid,), daemon=True).start()
    else:
        db.x("update questions set status=?, reviewer=?, reviewed_at=? where id=?",
             ("hold" if action == "hold" else "routed", who, db.now(), qid))
        if action == "route":
            to = {"pb": "담당 PB", "desk": "DMA 데스크"}.get(draft.get("route"), "법인영업 담당")
            db.x("insert into consults(persona,kind,question_id,context,state,at) values(?,?,?,?,?,?)",
                 (r["persona"], "질문 이관", qid, f"“{r['text']}” · {draft.get('route_reason','')}", f"신규 · {to}", db.now()))
    return 200, {"ok": True}


def _safe_export(qid, kinds=None):
    from . import export
    try:
        return export.build(qid, tuple(kinds) if kinds else export.KINDS)
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}


def exports_list(persona=None):
    sql = ("select e.*, q.text from exports e join questions q on q.id=e.question_id "
           + ("where e.persona=? " if persona else "") + "order by e.created_at desc")
    rows = db.q(sql, (persona,) if persona else ())
    for r in rows:
        r["files"] = db.loads(r["files"]) or []
    return rows


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

    # Netlify(정적) 화면이 Railway의 이 API를 부를 수 있게 허용 출처만 CORS 허용
    ALLOWED = {o.strip() for o in os.environ.get(
        "LOUNGE_ALLOWED_ORIGINS",
        "https://eugene-insightlab.netlify.app,http://127.0.0.1:8765,http://localhost:8765,http://localhost:3000,http://localhost:3300").split(",") if o.strip()}

    def end_headers(self):
        if not self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-cache, must-revalidate")
        origin = self.headers.get("Origin")
        if origin and origin in self.ALLOWED:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

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

    BLOCK = re.compile(r"^/(db_loader|supabase|quant_lab|\.netlify|\.git)(/|$)|^/lounge_api/(?!exports/)|\.(py|db|env|toml|ps1)$", re.I)

    def do_GET(self):
        u = urlparse(self.path)
        if self.BLOCK.search(u.path):
            return self._json(403, {"error": "접근할 수 없는 경로"})
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
            if p == "/api/measure":
                return self._json(200, measure.listing())
            m = re.fullmatch(r"/api/measure/sequence/([\w-]+)", p)
            if m:
                return self._json(200, measure.sequence(m.group(1)))
            if p == "/api/reports/all":
                return self._json(200, db.q("select id,title,published_at from reports order by published_at desc, id desc"))
            if p == "/api/exports":
                return self._json(200, exports_list(qs.get("persona") if qs.get("persona") in PERSONAS else None))
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
            if p in ("/api/ask", "/api/jarvis", "/api/jarvis/web") and not _rate_ok(self.client_address[0]):
                return self._json(429, {"error": "잠시 후 다시 질문해 주세요 (10분당 질문 수 제한)."})
            if p == "/api/ask":
                return self._json(*ask(b))
            if p == "/api/jarvis":
                return self._json(*jarvis(b))
            if p == "/api/jarvis/web":
                return self._json(*jarvis_web(b))
            if p == "/api/measure/trial":
                return self._json(200, measure.add(b))
            if p == "/api/measure/sample":
                measure.sample(int(b.get("n") or 6))
                return self._json(200, measure.listing())
            if p == "/api/measure/reset":
                db.x("delete from trials" + ("" if b.get("all") else " where sample=1"))
                return self._json(200, measure.listing())
            if p == "/api/export":
                out = _safe_export(int(b.get("id") or 0), b.get("kinds"))
                return self._json(400 if "error" in out else 200, out)
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


def _seed_db():
    """호스팅 첫 부팅: 볼륨에 DB가 없고 LOUNGE_DB_SEED_URL이 있으면 한 번 내려받는다 (Railway 볼륨은 직접 업로드가 안 됨)."""
    url = os.environ.get("LOUNGE_DB_SEED_URL")
    if not url or os.path.exists(db.PATH):
        return
    import urllib.request
    os.makedirs(os.path.dirname(db.PATH) or ".", exist_ok=True)
    tmp = db.PATH + ".part"
    print(f"lounge.db 내려받는 중 → {db.PATH}")
    urllib.request.urlretrieve(url, tmp)
    os.replace(tmp, db.PATH)


def main():
    ap = argparse.ArgumentParser()
    # Railway 등 호스팅: PORT · HOST 환경변수 (로컬 기본값은 그대로)
    ap.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8765")))
    ap.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"))
    a = ap.parse_args()
    _seed_db()
    db.init()
    measure.init()
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
