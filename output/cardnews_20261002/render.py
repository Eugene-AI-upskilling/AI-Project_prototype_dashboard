from pathlib import Path
from playwright.sync_api import sync_playwright

here = Path(__file__).parent
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1200, "height": 1400}, device_scale_factor=1)
    pg.goto((here / "cards.html").as_uri(), wait_until="networkidle")
    pg.evaluate("document.fonts.ready")
    for i in range(1, 10):
        el = pg.locator(f"#c{i}")
        out = here / f"card_{i:02d}.png"
        el.screenshot(path=str(out))
        # overflow check: body content should not exceed card height
        over = el.evaluate("e => e.scrollHeight > e.clientHeight || e.querySelector('.foot').offsetHeight < 96")
        print(out.name, "OVERFLOW" if over else "ok")
    b.close()
