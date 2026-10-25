# -*- coding: utf-8 -*-
"""카드뉴스 JSON → Supabase card_news 적재 (+ 선택: SNS용 PNG 내보내기).

  python -m db_loader.cardnews_push db_loader/cardnews/20261002_B_lee.jy_47.json
  python -m db_loader.cardnews_push --all            # cardnews/*.json 전부
  python -m db_loader.cardnews_push FILE --png       # 적재 + PNG(output/cardnews/<이름>/card_NN.png)
  python -m db_loader.cardnews_push FILE --png --no-push

JSON 형식: db_loader/cardnews/SCHEMA.md. report_url 로 reports.id 를 찾아 연결(원문 보기 링크).
"""
import argparse, glob, json, os, sys, threading, functools, http.server, urllib.parse

import requests

BASE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(BASE)                                   # yujin-research-center
OUT = os.path.join(os.path.dirname(SITE), "output", "cardnews")


def load(path):
    deck = json.load(open(path, encoding="utf-8"))
    for k in ("report_url", "title", "slides"):
        if not deck.get(k):
            raise ValueError(f"{os.path.basename(path)}: '{k}' 없음")
    return deck


def report_id(url):
    from . import supabase_upsert as su
    for u in {url, url.replace("http://", "https://"), url.replace("https://", "http://")}:
        res = requests.get(f"{su.URL}/rest/v1/reports", params={"select": "id", "url": f"eq.{u}"},
                           headers=su._headers(), timeout=30)
        res.raise_for_status()
        if res.json():
            return res.json()[0]["id"]
    return None


def push(decks):
    from . import supabase_upsert as su
    rows = []
    for d in decks:
        rid = report_id(d["report_url"])
        if rid is None:
            print(f"  [warn] reports에 없는 URL — 원문 보기는 리포트 목록으로 연결: {d['report_url']}")
        rows.append({"report_id": rid, "report_url": d["report_url"], "title": d["title"],
                     "category": d.get("category"), "analyst": d.get("analyst"), "team": d.get("team"),
                     "published_at": d.get("published_at"), "deck": d})
    n = su.upsert("card_news", rows, "report_url")
    print(f"card_news 적재(upsert): {n}건")


def export_png(path):
    """cardnews.html?file=...&export=1 을 로컬 서버로 띄워 슬라이드별 PNG 저장."""
    from playwright.sync_api import sync_playwright
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = functools.partial(Quiet, directory=SITE)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    rel = os.path.relpath(os.path.abspath(path), SITE).replace(os.sep, "/")
    name = os.path.splitext(os.path.basename(path))[0]
    out_dir = os.path.join(OUT, name)
    os.makedirs(out_dir, exist_ok=True)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            pg = b.new_page(viewport={"width": 1200, "height": 1400})
            pg.goto(f"http://127.0.0.1:{srv.server_port}/cardnews.html?export=1&file={urllib.parse.quote(rel)}")
            pg.wait_for_selector("body[data-ready='1']", timeout=30000)
            pg.evaluate("document.fonts.ready")
            pg.evaluate("document.querySelectorAll('#cxExport .cx').forEach(el=>CardNews.fit(el))")
            cards = pg.locator("#cxExport .cx")
            n = cards.count()
            for i in range(n):
                cards.nth(i).screenshot(path=os.path.join(out_dir, f"card_{i + 1:02d}.png"))
            b.close()
        print(f"PNG {n}장 → {out_dir}")
    finally:
        srv.shutdown()


if __name__ == "__main__":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="*")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--png", action="store_true")
    ap.add_argument("--no-push", action="store_true")
    a = ap.parse_args()
    files = sorted(glob.glob(os.path.join(BASE, "cardnews", "*.json"))) if a.all else a.files
    if not files:
        ap.error("JSON 파일을 지정하거나 --all")
    decks = [load(f) for f in files]
    if a.png:
        for f in files:
            export_png(f)
    if not a.no_push:
        push(decks)
