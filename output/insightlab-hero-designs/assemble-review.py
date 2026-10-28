from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parent
items=[('a-desktop.png','A · SIGNAL FIELD'),('b-desktop.png','B · VECTOR EDITORIAL'),('c-desktop.png','C · RESEARCH ORBIT'),('d-desktop.png','D · RED SHIFT')]
w,h,cap=720,450,42
sheet=Image.new('RGB',(w*2,(h+cap)*2),'#150c0f')
draw=ImageDraw.Draw(sheet)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
for i,(file,label) in enumerate(items):
    x=(i%2)*w;y=(i//2)*(h+cap)
    shot=Image.open(root/'qa'/file).convert('RGB').resize((w,h),Image.Resampling.LANCZOS)
    sheet.paste(shot,(x,y+cap))
    draw.text((x+22,y+12),label,font=font,fill='#f6eee8')
sheet.save(root/'hero-four-concepts.jpg',quality=94)
print('Saved hero-four-concepts.jpg')
