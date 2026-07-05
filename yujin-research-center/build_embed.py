# 편집 원본 index.html → 폰트 내장 단일 파일(netlify_dist/index.html) 재생성
import base64, pathlib, sys

root = pathlib.Path(__file__).parent
html = (root / "index.html").read_text(encoding="utf-8")
b64 = base64.b64encode((root / "assets" / "fonts" / "PretendardVariable.woff2").read_bytes()).decode()

# 1) head 폰트 링크: preconnect/preload 제거, CDN 스타일시트만 유지
old_head = '''<!-- Pretendard (design-system font): local woff2 우선, CDN은 폴백 -->
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
<link rel="preload" href="assets/fonts/PretendardVariable.woff2" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />'''
new_head = '''<!-- Pretendard (design-system font): local first, CDN fallback -->
<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />'''
if old_head not in html:
    sys.exit("ERROR: head font block not found")
html = html.replace(old_head, new_head)

# 2) @font-face src: 외부 경로 → base64 data URI
old_src = 'src:url("assets/fonts/PretendardVariable.woff2") format("woff2-variations");'
new_src = f'src:url("data:font/woff2;base64,{b64}") format("woff2-variations");'
if old_src not in html:
    sys.exit("ERROR: @font-face src not found")
html = html.replace(old_src, new_src)

out = root / "netlify_dist" / "index.html"
out.write_text(html, encoding="utf-8")
print("OK dist written:", out, len(html), "bytes")
