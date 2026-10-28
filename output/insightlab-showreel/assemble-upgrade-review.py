from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent
panels = [('hero-upgraded-desktop-open.png', '첫 화면 · Claude 쇼릴 전체 화면'),
          ('hero-upgraded-desktop-settled.png', '스크롤 후 · 쇼릴 축소 + 소개 등장')]
width, height, caption = 720, 450, 52
sheet = Image.new('RGB', (width * 2, height + caption), '#130c0e')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('C:/Windows/Fonts/malgun.ttf', 20)
for n, (name, label) in enumerate(panels):
    shot = Image.open(root / 'qa' / name).convert('RGB')
    shot = shot.resize((width, height), Image.Resampling.LANCZOS)
    sheet.paste(shot, (n * width, caption))
    draw.text((n * width + 22, 15), label, fill='#f6f4f1', font=font)
sheet.save(root / 'hero-upgraded-review.jpg', quality=92)
print('Saved hero-upgraded-review.jpg')
