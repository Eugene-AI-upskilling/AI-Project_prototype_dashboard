# -*- coding: utf-8 -*-
"""종목명·종목코드·증권사·애널리스트·제목 통합 검색 (대시보드 JS 와 같은 규칙).

공백으로 나눈 단어가 모두 어딘가에 포함되면 매칭 — 예) '하나 삼성E&A', '윤재성'.
"""


def _norm(s):
    return (s or "").lower().replace(" ", "")


def haystack(r):
    return _norm(" ".join([r.get("itemName") or "", r.get("itemCode") or "", r.get("brokerName") or "",
                           " ".join(r.get("analysts") or []), r.get("title") or ""]))


def search(reports, query):
    terms = [_norm(t) for t in (query or "").split() if t.strip()]
    if not terms:
        return list(reports)
    return [r for r in reports if all(t in haystack(r) for t in terms)]
