# -*- coding: utf-8 -*-
"""대시보드 로컬 서버 — 실시간 네이버 검색 · 요약 생성 · 텔레그램 전송.

  python server.py            → http://127.0.0.1:8791 자동으로 열림
  python server.py --port 9000 --no-browser

정적 HTML(output/analyst_reports.html)만 열어도 수집해 둔 리포트 검색은 되지만,
캐시에 없는 종목을 네이버에서 바로 찾거나 텔레그램으로 보내려면 이 서버로 열어야 한다
(봇 토큰을 HTML 에 넣지 않기 위해 전송은 서버가 대신 한다).
"""
import argparse
import json
import threading
import webbrowser
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

import naver_reports as nr
import telegram_send as tg
from search import search, _norm

cache = nr.load_cache()
_items = {}            # nid → 네이버 목록 item (요약 생성 시 content 가 필요)
_brokers = {}          # 증권사명 → brokerCode
_lock = nr._lock          # 캐시 dict 를 같이 만지므로 수집 모듈과 같은 락


def brokers():
    if not _brokers:
        for r in cache["reports"].values():
            _brokers[r["brokerName"]] = r["brokerCode"]
        try:   # 캐시에 없는 증권사도 이름으로 찾을 수 있게 최근 목록으로 보강
            for it in nr.list_reports(max_pages=6):
                _brokers.setdefault(it["brokerName"], it["brokerCode"])
                _items.setdefault(str(it["nid"]), it)
        except Exception as e:
            print("증권사 목록 보강 실패:", e)
    return _brokers


def _brief(it):
    """요약 전 목록 item → 화면용 레코드."""
    return {
        "nid": str(it["nid"]), "title": it.get("title"), "itemName": it.get("itemName"),
        "itemCode": it.get("itemCode"), "brokerName": it.get("brokerName"), "brokerCode": it.get("brokerCode"),
        "writeDate": it.get("writeDate"), "readCount": nr._num(it.get("readCount")),
        "opinionText": it.get("opinionText") or "", "opinionType": it.get("opinionType") or "",
        "goalPrice": nr._num(it.get("goalPrice")), "content": nr.strip_html(it.get("content")),
        "analysts": [], "url": f"https://stock.naver.com/research/company/{it['nid']}",
    }


def live_search(q):
    """네이버에서 바로 검색. 단어마다 증권사명 → brokerCodes, 종목명·코드 → itemCodes 로 바꾸고,
    둘 다 아닌 단어는 제목·본문 전문검색(query)으로 넘긴다. 애널리스트명은 캐시에서만 찾는다."""
    broker_codes, item_codes, keywords = [], [], []
    for t in q.split():
        b = [c for name, c in brokers().items() if len(_norm(t)) >= 2 and _norm(t) in _norm(name)]
        if b:
            broker_codes += b
            continue
        if any(_norm(t) in _norm(a) for r in cache["reports"].values() for a in r.get("analysts") or []):
            continue   # 애널리스트 이름 — 네이버 API 로는 못 찾음
        s = nr.resolve_stocks(t)
        if s:
            item_codes += s
        else:
            keywords.append(t)
    items = []
    if broker_codes or item_codes or keywords:
        try:
            items = nr.list_reports(query=" ".join(keywords) or None, broker_codes=broker_codes or None,
                                    item_codes=item_codes or None, max_pages=2)
        except Exception as e:
            print("네이버 검색 실패:", e)
    out = {}
    with _lock:
        for it in items:
            nid = str(it["nid"])
            _items[nid] = it
            out[nid] = cache["reports"].get(nid) or _brief(it)
    # 애널리스트명은 PDF 에서만 나오므로 캐시 검색 결과를 합친다
    for r in search(cache["reports"].values(), q):
        out.setdefault(r["nid"], r)
    return sorted(out.values(), key=lambda r: (r["writeDate"], int(r["nid"])), reverse=True)


def enrich(nids, use_llm=True):
    out = []
    for nid in nids:
        nid = str(nid)
        it = _items.get(nid)
        if not it:
            rec = cache["reports"].get(nid)
            if rec:
                it = dict(rec, content=rec.get("content"))
            else:
                continue
        out.append(nr.enrich(it, cache, use_llm=use_llm))
    with _lock:
        nr.save_cache(cache)
    return out


def find(nids):
    return [cache["reports"][str(n)] for n in nids if str(n) in cache["reports"]]


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def _send(self, code, body, ctype="application/json; charset=utf-8"):
        data = body if isinstance(body, bytes) else json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _json(self):
        n = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(n) or b"{}")

    def do_GET(self):
        u = urlparse(self.path)
        qs = parse_qs(u.query)
        if u.path in ("/", "/index.html"):
            path = nr.build_html(cache)
            with open(path, "rb") as f:
                return self._send(200, f.read(), "text/html; charset=utf-8")
        if u.path == "/api/status":
            return self._send(200, {"server": True, "telegram": tg.configured(),
                                    "llm": bool(nr.llm and nr.llm.available()),
                                    "updated": cache.get("updated"), "count": len(cache["reports"])})
        if u.path == "/api/search":
            q = (qs.get("q") or [""])[0].strip()
            return self._send(200, {"reports": live_search(q) if q else nr.sorted_reports(cache)})
        self._send(404, {"error": "not found"})

    def do_POST(self):
        u = urlparse(self.path)
        try:
            body = self._json()
            if u.path == "/api/enrich":
                return self._send(200, {"reports": enrich(body.get("nids") or [], body.get("llm", True))})
            if u.path == "/api/refresh":
                items = nr.list_reports(max_pages=2)
                with _lock:
                    for it in items:
                        _items[str(it["nid"])] = it
                return self._send(200, {"reports": nr.collect(items, cache, use_llm=body.get("llm", True))})
            if u.path == "/api/telegram":
                nids = [str(n) for n in body.get("nids") or []]
                missing = [n for n in nids if not cache["reports"].get(n, {}).get("summary")]
                if missing:   # 실시간 검색으로만 본 리포트는 먼저 요약해서 캐시에 넣는다
                    enrich(missing)
                reps = find(nids)
                if not reps:
                    return self._send(400, {"error": "전송할 리포트가 없습니다"})
                n = tg.send_reports(reps, body.get("title") or None)
                return self._send(200, {"ok": True, "messages": n, "reports": len(reps)})
        except Exception as e:
            return self._send(500, {"error": str(e)})
        self._send(404, {"error": "not found"})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8791)
    ap.add_argument("--no-browser", action="store_true")
    args = ap.parse_args()
    ThreadingHTTPServer.allow_reuse_address = False   # Windows 에선 True 면 이미 쓰는 포트에도 겹쳐 붙는다
    srv = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    url = f"http://127.0.0.1:{args.port}"   # localhost 가 ::1 로 풀리면 127.0.0.1 바인딩에 안 붙음
    print(f"리포트 대시보드: {url}  (캐시 {len(cache['reports'])}건, "
          f"텔레그램 {'설정됨' if tg.configured() else '미설정'}) — 종료 Ctrl+C")
    if not args.no_browser:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
