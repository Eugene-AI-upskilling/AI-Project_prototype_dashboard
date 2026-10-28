from pathlib import Path
from html import escape
import json

from derivatives_cases import SOURCES, CASES
from institutional_strategy_body import BODY, SCRIPT

ROOT = Path(__file__).resolve().parent.parent
source_map = {s[0]: s for s in SOURCES}

def refs(*ids):
    return ' · '.join(f'<a href="{escape(source_map[i][2], quote=True)}" target="_blank" rel="noopener">{escape(source_map[i][1])} ↗</a>' for i in ids)

def card(c, i):
    return f'''<article class="case" data-group="{escape(c['group'])}">
<div class="case-top"><span class="eyebrow">CASE {i:02d} · {escape(c['tag'])}</span><span class="pill">{escape(c['priority'])}</span></div>
<h3>{escape(c['name'])}</h3><p class="fact"><span class="label">확인된 기능</span>{escape(c['fact'])}</p>
<p class="lesson">{escape(c['lesson'])}</p>
<details><summary>유진 적용 · 수익 연결 · 도입 조건</summary><div class="case-detail">
<h4>유진 적용 제안</h4><p>{escape(c['apply'])}</p><h4>수익 연결 가설</h4><p>{escape(c['money'])}</p><h4>도입 조건과 한계</h4><p>{escape(c['limit'])}</p></div></details>
<div class="source-inline">{refs(*c['sources'])}</div></article>'''

body = BODY.replace('__CASES__', '\n'.join(card(c, i+1) for i, c in enumerate(CASES)))
body = body.replace('__CASE_COUNT__', str(len(CASES))).replace('__SOURCE_COUNT__', str(len(SOURCES)))
for key in source_map:
    body = body.replace('__REF_' + key + '__', refs(key))
body = body.replace('__SOURCES__', '\n'.join(f'<li id="source-{s[0]}"><a href="{escape(s[2],quote=True)}" target="_blank" rel="noopener">{escape(s[1])} ↗</a><small>{escape(s[3])}</small></li>' for s in SOURCES))
assert '__' not in body, 'Unresolved report placeholder'
style = (ROOT/'tmp'/'institutional-report.css').read_text(encoding='utf-8')
html = f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="글로벌 기관 플랫폼 비교와 유진투자증권의 리서치·파생·DMA 특화 전략. 고객 서비스와 내부 프랍 활용, 수익화 계산, 해커톤 실행 계획.">
<title>유진투자증권 | 파생·DMA·프랍 특화 전략</title><style>{style}</style></head><body id="top">{body}<script>{SCRIPT}</script></body></html>'''
out = ROOT/'eugene-institutional-strategy.html'
out.write_text(html, encoding='utf-8')
print(json.dumps({'path':str(out),'bytes':out.stat().st_size,'cases':len(CASES),'sources':len(SOURCES)}, ensure_ascii=True))
