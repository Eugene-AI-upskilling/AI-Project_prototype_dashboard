from pathlib import Path
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import json, math

root=Path(__file__).resolve().parent.parent
path=root/'eugene-institutional-strategy.html'
html=path.read_text(encoding='utf-8')
soup=BeautifulSoup(html,'html.parser')
ids=[e['id'] for e in soup.select('[id]')]
assert len(ids)==len(set(ids)), 'Duplicate ids'
assert len(soup.select('article.case'))==19
source_count=len(soup.select('.source-list li'))
assert source_count>=25
assert all(soup.select_one(a['href']) for a in soup.select('a[href^="#"]'))
assert '__CASES__' not in html and '\ufffd' not in html
assert 'DRM' not in html
assert '\ucc44\uad8c\ubd80\ud130 \uc2dc\uc791' not in html
assert 'Direct Market Access' in html and 'QuantConnect' in html
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':1440,'height':1050},device_scale_factor=1)
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.goto(path.as_uri(),wait_until='load')
    assert page.locator('#caseStatus').inner_text()=='19 / 19개 사례'
    assert page.locator('#volumeResult').inner_text()=='24,000,000편도'
    assert page.locator('#grossResult').inner_text()=='4.80억원'
    assert page.locator('#profitResult').inner_text()=='0.40억원'
    assert '34계좌' in page.locator('#breakEven').inner_text()
    page.screenshot(path=str(root/'tmp'/'institutional-desktop.png'))
    page.locator('[data-filter="specialist"]').click()
    assert page.locator('.case:visible').count()==3
    page.locator('[data-filter="all"]').click()
    page.locator('#caseSearch').fill('Marex')
    assert page.locator('.case:visible').count()==1
    page.locator('#caseSearch').fill('zzzz-no-case')
    assert page.locator('.case:visible').count()==0
    page.locator('#caseSearch').fill('')
    page.locator('#expandAll').click()
    assert page.locator('.case details[open]').count()==19
    page.locator('#expandAll').click()
    assert page.locator('.case details[open]').count()==0
    page.locator('[data-scenario="low"]').click()
    assert page.locator('#profitResult').inner_text()=='-1.79억원'
    page.locator('[data-scenario="high"]').click()
    assert page.locator('#profitResult').inner_text()=='9.96억원'
    page.locator('[data-scenario="base"]').click()
    page.locator('#clients').fill('33')
    assert page.locator('#profitResult').inner_text()=='-0.02억원'
    page.locator('#clients').fill('34')
    assert page.locator('#profitResult').inner_text()=='0.04억원'
    page.locator('#incremental').fill('101')
    assert page.locator('#calcError').is_visible()
    page.locator('[data-scenario="base"]').click()
    page.locator('#netFee').fill('0')
    assert '손익분기 불가' in page.locator('#breakEven').inner_text()
    page.locator('[data-scenario="base"]').click()
    page.locator('#clients').fill('0')
    assert page.locator('#profitResult').inner_text()=='-2.00억원'
    page.locator('#clients').fill('1.5')
    assert page.locator('#calcError').is_visible()
    page.locator('[data-scenario="base"]').click()
    page.locator('#accountMargin').fill('10')
    assert page.locator('#profitResult').inner_text()=='0.88억원'
    page.locator('[data-scenario="base"]').click()
    page.locator('#revenue').scroll_into_view_if_needed()
    page.screenshot(path=str(root/'tmp'/'institutional-revenue.png'))
    page.locator('#benchmarks').scroll_into_view_if_needed()
    page.screenshot(path=str(root/'tmp'/'institutional-cases.png'))
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Desktop overflow'
    page.set_viewport_size({'width':390,'height':844})
    page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Mobile overflow'
    page.screenshot(path=str(root/'tmp'/'institutional-mobile.png'))
    page.emulate_media(media='print')
    page.evaluate("window.dispatchEvent(new Event('beforeprint'))")
    assert page.locator('.case details[open]').count()==19
    page.evaluate("window.dispatchEvent(new Event('afterprint'))")
    page.pdf(path=str(root/'tmp'/'institutional-print-check.pdf'),prefer_css_page_size=True,print_background=True)
    assert not errors, errors
    browser.close()
print(json.dumps({'result':'PASS','cases':19,'sources':source_count,'checks':['HTML ids and anchors','DMA content correction','desktop and mobile overflow','search and filters','expand/collapse','DMA scenarios and zero accounts','break-even boundary and invalid inputs','separate account-contract contribution','print rendering','no JavaScript errors']},ensure_ascii=True))
