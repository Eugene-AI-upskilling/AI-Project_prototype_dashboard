# -*- coding: utf-8 -*-
"""쪽 단위 근거 검색 — 글자 2-gram BM25 (한국어 형태소 분석기 없이 동작).

리포트 2~3천 쪽 규모라 메모리 색인으로 충분하다. 새 리포트를 적재하면 reload()로 다시 만든다.
"""
import math
import re
import threading
from collections import Counter, defaultdict
from datetime import date

from . import db

_WORD = re.compile(r"[0-9A-Za-z]+|[가-힣]+")
_STOP = set("있는 하는 것으로 으로 에서 대한 위해 따른 통해 이후 기준 자료 단위 전년 대비 증가 감소 예상 전망 대해 한다 했다 이다 있다 된다 하고 하여 에서".split())
_lock = threading.Lock()
_idx = None


def grams(text):
    out = []
    for w in _WORD.findall(text.lower()):
        if w.isascii():
            if len(w) > 1:
                out.append(w)
        elif len(w) == 1:
            out.append(w)
        else:
            out.extend(w[i:i + 2] for i in range(len(w) - 1))
    return [g for g in out if g not in _STOP]


class Index:
    def __init__(self):
        rows = db.q("select p.report_id, p.page, p.text, r.published_at from pages p join reports r on r.id=p.report_id")
        # 리포트 제목(+카테고리) 글자 조각 — 주제를 가장 잘 드러내므로 검색 점수에 가산
        self.title = {r["id"]: set(grams(f"{r['title'] or ''} {r['category'] or ''}"))
                      for r in db.q("select id,title,category from reports")}
        self.docs = []                       # (report_id, page, published_at)
        self.tf = []
        self.df = Counter()
        for r in rows:
            c = Counter(grams(r["text"]))
            self.docs.append((r["report_id"], r["page"], r["published_at"]))
            self.tf.append(c)
            self.df.update(c.keys())
        self.n = len(self.docs)
        self.len = [sum(c.values()) for c in self.tf]
        self.avg = (sum(self.len) / self.n) if self.n else 1
        self.post = defaultdict(list)
        for i, c in enumerate(self.tf):
            for g, f in c.items():
                self.post[g].append((i, f))
        dates = sorted(d[2] for d in self.docs if d[2])
        self.d0, self.d1 = (dates[0], dates[-1]) if dates else ("", "")

    def _recency(self, d):
        if not d or self.d0 == self.d1:
            return 0.0
        a, b, x = (date.fromisoformat(v) for v in (self.d0, self.d1, d))
        return (x - a).days / max(1, (b - a).days)

    def search(self, query, k=14, per_report=3, only_report=None):
        qg = Counter(grams(query))
        if not qg:
            return []
        k1, b = 1.2, 0.75
        score = defaultdict(float)
        for g in qg:
            df = self.df.get(g)
            if not df:
                continue
            idf = math.log(1 + (self.n - df + 0.5) / (df + 0.5))
            for i, f in self.post[g]:
                if only_report and self.docs[i][0] != only_report:
                    continue
                score[i] += idf * f * (k1 + 1) / (f + k1 * (1 - b + b * self.len[i] / self.avg))
        idf = {g: math.log(1 + (self.n - self.df[g] + 0.5) / (self.df[g] + 0.5)) for g in qg if self.df.get(g)}
        tb = {}
        for i in score:
            rid = self.docs[i][0]
            if rid not in tb:
                tb[rid] = sum(v for g, v in idf.items() if g in self.title.get(rid, ()))
            score[i] += 1.5 * tb[rid]
        ranked = sorted(score.items(), key=lambda t: -t[1] * (1 + 0.25 * self._recency(self.docs[t[0]][2])))
        out, per = [], Counter()
        for i, s in ranked:
            rid, page, d = self.docs[i]
            if per[rid] >= per_report:
                continue
            per[rid] += 1
            out.append({"report_id": rid, "page": page, "date": d, "score": round(s, 2)})
            if len(out) >= k:
                break
        return out


def index():
    global _idx
    with _lock:
        if _idx is None:
            _idx = Index()
        return _idx


def reload():
    global _idx
    with _lock:
        _idx = None
    return index()


def search(query, **kw):
    return index().search(query, **kw)
