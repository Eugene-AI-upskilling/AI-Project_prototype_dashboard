from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent
items = [('01', 'BLUE CURRENT'), ('02', 'WHITE CURRENT'), ('03', 'RED EDITORIAL'), ('04', 'SPLIT ATLAS'), ('05', 'RESEARCH STUDIO'), ('06', 'SOFT MONO')]
w, h, cap = 720, 450, 42
sheet = Image.new('RGB', (w * 3, (h + cap) * 2), '#f2f4f8')
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 17)
for i, (number, label) in enumerate(items):
    x, y = i % 3 * w, i // 3 * (h + cap)
    shot = Image.open(root / 'qa' / f'{number}-desktop.png').convert('RGB').resize((w, h), Image.Resampling.LANCZOS)
    sheet.paste(shot, (x, y + cap))
    draw.text((x + 22, y + 12), f'{number} / {label}', font=font, fill='#283246')
sheet.save(root / 'six-directions.jpg', quality=94)
print('Saved six-directions.jpg')
