# -*- coding: utf-8 -*-
"""맞춤 전환 실물 출력 — 검수된 답변 1건 → 기관 브리핑 PDF · 자문사 설명자료 PDF · HNW 카드뉴스 PNG.

  python -m lounge_api.export 1          # 질문 id 1 의 세 가지를 모두 만든다
  python -m lounge_api.export 1 brief    # 하나만

AI를 다시 부르지 않는다. 애널리스트가 검수한 문장과 출처만 템플릿에 옮긴다(새 주장이 끼어들지 않게).
결과: lounge_api/exports/q{id}/ (brief.pdf, explainer.pdf, cardnews.json, cardnews_01.png …)
카드뉴스는 사이트 카드뉴스와 같은 렌더러(cardnews.html?export=1)를 쓴다.
"""
import functools
import glob
import html
import http.server
import json
import os
import re
import sys
import threading
import urllib.parse
from datetime import datetime

from . import db

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "exports")
KINDS = ("brief", "explainer", "cardnews")
LABEL = {"brief": "회의용 브리핑", "explainer": "고객 설명자료", "cardnews": "카드뉴스"}
DISC = ("본 자료는 유진투자증권 리서치센터의 준법 승인 리포트를 인용해 정보 제공 목적으로 작성되었으며 투자 권유가 아닙니다. "
        "투자 판단의 최종 책임은 투자자 본인에게 있습니다. 일반투자자의 상품 문의는 적합성 확인을 위해 담당 PB가 안내합니다.")
E = lambda s: html.escape(str(s or ""))
short = lambda t: re.sub(r"^(가설|관점)\s*\d+\s*·\s*", "", t or "")


def _load(qid):
    r = db.q("select * from questions where id=?", (qid,), one=True)
    if not r or r["status"] != "reviewed":
        raise ValueError("검수 완료된 답변만 전환할 수 있습니다")
    a = db.loads(r["answer"]) or {}
    srcs, notes = {}, []           # (report_id,page) → 각주 번호
    def fn(s):
        v = (s or {}).get("verify") or {}
        if not v.get("report_id"):
            return ""
        k = (v["report_id"], v["page"])
        if k not in srcs:
            srcs[k] = len(srcs) + 1
            notes.append(v)
        return srcs[k]
    for h in a.get("hypotheses", []):
        for s in h["facts"] + [h["view"], h["counter"]]:
            if s.get("text"):
                s["fn"] = fn(s)
    reviewed = datetime.fromtimestamp(r["reviewed_at"] or r["created_at"])
    base = max((n.get("date") or "" for n in notes), default="")
    return r, a, notes, reviewed, base


# ───────── HTML 템플릿 (A4) ─────────
CSS = """
@font-face{font-family:P;src:url("../../../assets/fonts/PretendardVariable.woff2") format("woff2-variations");font-weight:45 920}
@page{size:A4;margin:16mm 15mm 18mm}
*{box-sizing:border-box}body{margin:0;font-family:P,"Malgun Gothic",sans-serif;color:#17181b;font-size:10.5pt;line-height:1.62;letter-spacing:-.01em}
.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2.2pt solid #0b2e6b;padding-bottom:6pt}
.hd .b{font-size:8.5pt;font-weight:800;letter-spacing:.12em;color:#0b2e6b}.hd .m{font-size:8pt;color:#6b7684;text-align:right}
.logo{height:15pt;vertical-align:-3pt;margin-right:6pt}
h1{font-size:17pt;line-height:1.35;margin:14pt 0 8pt;color:#0b2e6b;letter-spacing:-.02em}
h2{font-size:11.5pt;margin:16pt 0 6pt;color:#0b2e6b}
.vd{background:#eef4fd;border-left:3pt solid #3182f6;padding:9pt 12pt;font-weight:600;border-radius:4pt}
table{width:100%;border-collapse:collapse;margin-top:8pt;font-size:9.5pt}
th{background:#f3f5f8;text-align:left;padding:6pt 7pt;font-size:8.5pt;color:#6b7684;border-bottom:1pt solid #dde4eb}
td{padding:7pt;border-bottom:.6pt solid #e6ebf2;vertical-align:top}
.st{font-weight:800;white-space:nowrap}.up{color:#11845a}.down{color:#6b7684}.neutral{color:#3182f6}
.hy{margin-top:10pt;page-break-inside:avoid}.hy h3{font-size:10.5pt;margin:0 0 4pt}
dl{display:grid;grid-template-columns:62pt 1fr;margin:0;row-gap:3pt}dt{font-size:8.5pt;font-weight:800;color:#6b7684;padding-top:1.5pt}dd{margin:0}
dt.v{color:#3182f6}dt.c{color:#e0344b}
sup{font-size:7pt;color:#3182f6;font-weight:800}
.fn{margin-top:14pt;border-top:.6pt solid #dde4eb;padding-top:6pt;font-size:8pt;color:#6b7684}
.fn li{margin:1pt 0}.ok{color:#11845a;font-weight:700}
.ft{margin-top:12pt;font-size:7.6pt;color:#8d9299;line-height:1.55}
.qa{margin-top:12pt}.qa h2{margin-top:14pt}.qa p,.qa ul{margin:4pt 0}
.qa ul{padding-left:14pt}.tag{display:inline-block;font-size:8pt;font-weight:800;color:#3182f6;background:#eef4fd;border-radius:3pt;padding:1pt 5pt;margin-right:4pt}
"""


def _page(title, body):
    return f'<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>{E(title)}</title><style>{CSS}</style></head><body>{body}</body></html>'


def _sup(s):
    return f"<sup>[{s['fn']}]</sup>" if s.get("fn") else ""


def _notes(notes):
    st = {"ok": '<span class="ok">원문 일치</span>', "partial": "부분 일치", "missing": "확인 필요"}
    return '<ol class="fn">' + "".join(
        f"<li>[{i}] {E(n.get('title'))} · {E(n.get('date'))} · {n.get('page')}쪽 · {st.get(n.get('status'), '')}</li>"
        for i, n in enumerate(notes, 1)) + "</ol>"


def brief_html(r, a, notes, reviewed, base):
    tone = {"유효": "up", "부분 유효": "neutral", "약함": "down", "단기 요인": "neutral"}
    rows = "".join(f"<tr><td><b>{E(short(h['title']))}</b></td><td class='st {tone.get(h['strength'], '')}'>{E(h['strength'])}</td>"
                   f"<td>{E(h['view']['text'])}{_sup(h['view'])}</td></tr>" for h in a["hypotheses"])
    hyps = "".join(
        f"<div class='hy'><h3>{E(h['title'])} <span class='st {tone.get(h['strength'], '')}'>· 근거 {E(h['strength'])}</span></h3><dl>"
        + "".join(f"<dt>사실</dt><dd>{E(f['text'])}{_sup(f)}</dd>" for f in h["facts"])
        + f"<dt class='v'>당사 견해</dt><dd>{E(h['view']['text'])}{_sup(h['view'])}</dd>"
        + (f"<dt class='c'>반대 근거</dt><dd>{E(h['counter']['text'])}{_sup(h['counter'])}</dd>" if h["counter"].get("text") else "")
        + f"<dt>확인할 점</dt><dd>{E(' · '.join(h['checks']))}</dd></dl></div>" for h in a["hypotheses"])
    body = (f"<div class='hd'><div class='b'><img class='logo' src='../../../assets/eugene-logo.png'>MEETING BRIEF · AI RESEARCH LOUNGE</div>"
            f"<div class='m'>근거 기준일 {E(base)}<br>검수 {E(r['reviewer'])} · {reviewed:%Y.%m.%d}</div></div>"
            f"<h1>{E(r['text'])}</h1><div class='vd'>{E(a['verdict'])}</div>"
            f"<h2>가설별 판단</h2><table><tr><th style='width:30%'>가설</th><th style='width:13%'>근거 강도</th><th>당사 견해</th></tr>{rows}</table>"
            f"<h2>근거</h2>{hyps}{_notes(notes)}<p class='ft'>{DISC}</p>")
    return _page("회의용 브리핑", body)


def explainer_html(r, a, notes, reviewed, base):
    facts = "".join(f"<li>{E(h['facts'][0]['text'])}{_sup(h['facts'][0])}</li>" for h in a["hypotheses"] if h["facts"])
    views = "".join(f"<li><span class='tag'>{E(short(h['title']))}</span>{E(h['view']['text'])}{_sup(h['view'])}</li>" for h in a["hypotheses"])
    counters = "".join(f"<li>{E(h['counter']['text'])}{_sup(h['counter'])}</li>" for h in a["hypotheses"] if h["counter"].get("text"))
    checks = "".join(f"<li>{E(c)}</li>" for c in dict.fromkeys(c for h in a["hypotheses"] for c in h["checks"]))
    body = (f"<div class='hd'><div class='b'><img class='logo' src='../../../assets/eugene-logo.png'>고객 설명자료 · 자문사 배포용</div>"
            f"<div class='m'>근거 기준일 {E(base)}<br>유진투자증권 리서치센터 자료 기반</div></div>"
            f"<h1>“{E(r['text'])}”</h1><div class='vd'>{E(a['verdict'])}</div><div class='qa'>"
            f"<h2>지금까지 확인된 사실</h2><ul>{facts}</ul>"
            f"<h2>유진 리서치는 이렇게 봅니다</h2><ul>{views}</ul>"
            + (f"<h2>함께 알아둘 점</h2><ul>{counters}</ul>" if counters else "")
            + f"<h2>앞으로 확인할 것</h2><ul>{checks}</ul></div>{_notes(notes)}<p class='ft'>{DISC}</p>")
    return _page("고객 설명자료", body)


def deck(r, a, notes, reviewed, base):
    def br(t, n=13):
        t = t.strip()
        if len(t) <= n or "\n" in t:
            return t
        cut = t.rfind(" ", 0, n + 3)
        return t[:cut] + "\n" + t[cut + 1:] if cut > 4 else t
    tone = {"유효": "up", "약함": "down"}
    slides = [{"type": "cover", "title": br(r["text"], 12), "date": f"{reviewed:%Y.%m.%d} 애널리스트 검수 · 근거 기준일 {base}",
               "stats": [{"label": "인용 원문", "value": f"{len(notes)}쪽"},
                         {"label": "원문 대조", "value": f"{sum(n.get('status') == 'ok' for n in notes)}/{len(notes)}"}]},
              {"type": "content", "kicker": "한눈에 보기", "title": "결론을\n단정하지 않아요",
               "blocks": [{"t": "takeaway", "text": a["verdict"]},
                          {"t": "list", "items": [{"title": short(h["title"]), "desc": f"근거 {h['strength']}"} for h in a["hypotheses"]]}]}]
    for h in a["hypotheses"][:3]:
        blocks = [{"t": "kv", "label": "근거 강도", "value": h["strength"], **({"tone": tone[h["strength"]]} if h["strength"] in tone else {})},
                  {"t": "list", "items": [{"title": "확인된 사실", "desc": h["facts"][0]["text"]} if h["facts"] else None,
                                          {"title": "반대 근거", "desc": h["counter"]["text"]} if h["counter"].get("text") else None]}]
        blocks[1]["items"] = [i for i in blocks[1]["items"] if i]
        if not blocks[1]["items"]:
            blocks.pop()
        v = h["view"].get("verify") or {}
        blocks.append({"t": "note", "text": f"출처: {v.get('title', '')} · {v.get('date', '')} · {v.get('page', '')}쪽"})
        slides.append({"type": "content", "kicker": short(h["title"]), "title": br(h["view"]["text"].rstrip("."), 13),
                       "sub": "유진 리서치의 판단이에요.", "blocks": blocks})
    checks = list(dict.fromkeys(c for h in a["hypotheses"] for c in h["checks"]))[:4]
    slides.append({"type": "content", "kicker": "다음 체크포인트", "title": "앞으로\n이것을 지켜보세요",
                   "blocks": [{"t": "list", "items": [{"title": c} for c in checks]},
                              {"t": "note", "text": "궁금한 점은 담당 PB에게 물어보세요."}], "disc": True})
    first = notes[0] if notes else {}
    return {"report_url": (first.get("url") or "").split("#")[0], "title": r["text"][:30], "category": r["topic"] or "리서치",
            "analyst": r["reviewer"] or "", "team": "유진투자증권 리서치센터", "published_at": f"{reviewed:%Y-%m-%d}",
            "brand": "EUGENE AI RESEARCH LOUNGE", "source": f"자료: 유진투자증권 리서치센터 리포트 원문 {len(notes)}쪽 인용",
            "slides": slides}


# ───────── 렌더링 ─────────
class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def _serve():
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(_Quiet, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def build(qid, kinds=KINDS):
    """질문 id → {kind: [파일 경로(사이트 루트 기준)]}"""
    r, a, notes, reviewed, base = _load(qid)
    d = os.path.join(OUT, f"q{qid}")
    os.makedirs(d, exist_ok=True)
    rel = lambda p: os.path.relpath(p, ROOT).replace(os.sep, "/")
    out = {}
    from playwright.sync_api import sync_playwright
    srv = _serve()
    base_url = f"http://127.0.0.1:{srv.server_port}/"
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            for k in kinds:
                if k in ("brief", "explainer"):
                    hp = os.path.join(d, f"{k}.html")
                    open(hp, "w", encoding="utf-8").write((brief_html if k == "brief" else explainer_html)(r, a, notes, reviewed, base))
                    pg = b.new_page()
                    pg.goto(base_url + rel(hp))
                    pg.evaluate("document.fonts.ready")
                    pdf = os.path.join(d, f"{k}.pdf")
                    pg.pdf(path=pdf, format="A4", print_background=True,
                           display_header_footer=True, header_template="<span></span>",
                           footer_template="<div style='font-size:7px;color:#999;width:100%;text-align:center'>"
                                           "유진투자증권 리서치센터 · <span class='pageNumber'></span>/<span class='totalPages'></span></div>",
                           margin={"top": "16mm", "bottom": "18mm", "left": "15mm", "right": "15mm"})
                    pg.close()
                    out[k] = [rel(pdf)]
                elif k == "cardnews":
                    dk = deck(r, a, notes, reviewed, base)
                    sys.path.insert(0, ROOT)
                    from db_loader.make_cardnews import validate
                    errs = validate(dk)
                    if errs:
                        raise ValueError("카드뉴스 형식 오류: " + "; ".join(errs))
                    jp = os.path.join(d, "cardnews.json")
                    json.dump(dk, open(jp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
                    for old in glob.glob(os.path.join(d, "cardnews_*.png")):
                        os.remove(old)
                    pg = b.new_page(viewport={"width": 1200, "height": 1400})
                    pg.goto(f"{base_url}cardnews.html?export=1&file={urllib.parse.quote(rel(jp))}")
                    pg.wait_for_selector("body[data-ready='1']", timeout=30000)
                    pg.evaluate("document.fonts.ready")
                    pg.evaluate("document.querySelectorAll('#cxExport .cx').forEach(el=>CardNews.fit(el))")
                    cards = pg.locator("#cxExport .cx")
                    files = []
                    for i in range(cards.count()):
                        fp = os.path.join(d, f"cardnews_{i + 1:02d}.png")
                        cards.nth(i).screenshot(path=fp)
                        files.append(rel(fp))
                    pg.close()
                    out[k] = files
            b.close()
    finally:
        srv.shutdown()
    with db._lock, db.conn() as c:
        for k, files in out.items():
            c.execute("delete from exports where question_id=? and kind=?", (qid, k))
            c.execute("insert into exports(question_id,persona,kind,files,created_at) values(?,?,?,?,?)",
                      (qid, r["persona"], k, json.dumps(files), db.now()))
    return out


if __name__ == "__main__":
    db.init()
    qid = int(sys.argv[1])
    ks = tuple(sys.argv[2:]) or KINDS
    for k, fs in build(qid, ks).items():
        print(f"  {LABEL[k]}: {len(fs)}개 → {fs[0]}{' …' if len(fs) > 1 else ''}")
