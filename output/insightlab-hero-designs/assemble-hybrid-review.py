from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent
items = [('e-desktop.png', '01 / SIGNAL — FULL SCREEN'), ('e-settled.png', '02 / STORY — SHOWREEL CARD')]
w, h, cap = 720, 450, 42
sheet = Image.new('RGB', (w * 2, h + cap), '#150c0f')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 17)
for i, (file, label) in enumerate(items):
    shot = Image.open(root / 'qa' / file).convert('RGB').resize((w, h), Image.Resampling.LANCZOS)
    sheet.paste(shot, (i * w, cap))
    draw.text((i * w + 22, 12), label, font=font, fill='#f6eee8')
sheet.save(root / 'hero-signal-story.jpg', quality=94)
print('Saved hero-signal-story.jpg')
