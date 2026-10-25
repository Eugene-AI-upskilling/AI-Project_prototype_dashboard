# -*- coding: utf-8 -*-
"""리포트 PDF → reports + pages (쪽별 원문).

  python -m lounge_api.ingest                 # db_loader/_cache 의 PDF 전부 (이미 적재된 파일은 건너뜀)
  python -m lounge_api.ingest 파일.pdf ...     # 특정 PDF만 (새 리포트 투입 시연용)

LLM을 쓰지 않는다. 제목은 PDF 첫 쪽 글씨 크기로, 유형·작성자·날짜는 파일명 규칙으로 뽑는다.
"""
import glob
import os
import re
import sys

from . import db

ROOT = os.path.dirname(os.path.dirname(__file__))
CACHE = os.path.join(ROOT, "db_loader", "_cache")
BASE_URL = "https://www.eugenefn.com/common/files/amail/"


def _meta(fp):
    sys.path.insert(0, ROOT)
    from db_loader import extract_reports as er
    fn = os.path.basename(fp)
    info = er.parse_url(BASE_URL + fn)
    amap = er._AUTHORS.get(info["author_id"], {}) if isinstance(er._AUTHORS.get(info["author_id"]), dict) else {}
    title, big = er.pdf_title(fp)
    if info["kind"] == "macro":
        cat = "투자전략"
    elif info["kind"] == "sector":
        cat = er._SECTORS.get(info["sector_code"]) or "산업분석"
    else:
        cat = big or "기업분석"
    return {"file": fn, "url": BASE_URL + fn, "title": title or f"[{cat}] 리포트", "kind": info["kind"],
            "category": cat, "ticker": info["ticker"], "author": amap.get("name") or info["author_id"],
            "desk": amap.get("desk"), "published_at": info["date"]}


_SKIP = re.compile(r"@|^당사|^동 ?자료|^본 ?자료|^자료|^\(?\d[\d\s.,/%()~-]*\)?$|^주가|^\d{2}\)|투자의견|목표주가|Compliance|없습니다$|있습니다$|^n |^News Comment|^\[?Weekly\b")


def title_fallback(text):
    """글씨 크기로 제목을 못 찾은 리포트: 첫 쪽에서 업종명과 첫 헤드라인 줄을 고른다."""
    lines = [re.sub(r"\s+", " ", l).strip() for l in text.splitlines()]
    desk = None
    for l in lines[:40]:
        m = re.match(r"^Weekly\s*\|\s*([^|]{2,20})\|", l) or re.match(r"^([가-힣A-Za-z]+(?:/[가-힣A-Za-z]+)+)\s+[가-힣]{2,4}$", l)
        if m:
            desk = m.group(1).strip()
            break
    head = next((l for l in lines[:60] if 6 <= len(l) <= 60 and not _SKIP.search(l)
                 and sum(ch.isdigit() for ch in l) < len(l) * 0.3 and not (desk and l.startswith(desk))), None)
    if head and desk:
        return f"{desk}: {head}"
    return head or desk


def _clean(t):
    t = t.replace(" ", " ")
    t = re.sub(r"[ \t]+", " ", t)
    return re.sub(r"\n{3,}", "\n\n", t).strip()


def ingest_file(fp, verbose=True):
    """PDF 1건 적재. 새로 넣었으면 report id, 이미 있으면 None."""
    import fitz
    fn = os.path.basename(fp)
    if db.q("select id from reports where file=?", (fn,), one=True):
        return None
    doc = fitz.open(fp)
    m = _meta(fp)
    if m["title"].endswith("] 리포트"):
        first = doc[0].get_text() + "\n" + (doc[1].get_text() if doc.page_count > 1 else "")
        m["title"] = title_fallback(first) or m["title"]
    rid = db.x("insert into reports(file,url,title,kind,category,ticker,author,desk,published_at,page_count,added_at) "
               "values(?,?,?,?,?,?,?,?,?,?,?)",
               (m["file"], m["url"], m["title"], m["kind"], m["category"], m["ticker"], m["author"],
                m["desk"], m["published_at"], doc.page_count, db.now()))
    with db._lock, db.conn() as c:
        c.executemany("insert into pages(report_id,page,text) values(?,?,?)",
                      [(rid, i + 1, _clean(p.get_text())) for i, p in enumerate(doc)])
    if verbose:
        print(f"  + {m['published_at']} {m['category']:<8} {m['title'][:50]} ({doc.page_count}쪽)")
    return rid


def main(paths=None):
    db.init()
    files = paths or sorted(glob.glob(os.path.join(CACHE, "*.pdf")))
    added = 0
    for fp in files:
        try:
            if ingest_file(fp, verbose=bool(paths)):
                added += 1
        except Exception as e:
            print("  [skip]", os.path.basename(fp), e)
    total = db.q("select count(*) n from reports", one=True)["n"]
    print(f"적재 {added}건 추가 · 전체 {total}건")


if __name__ == "__main__":
    main(sys.argv[1:] or None)
