# Contact sheets of the checkpoint screenshots: 12 per sheet, timestamp burned in.
#   python3 test/sheets.py screenshots portrait
import sys, glob, os
from PIL import Image, ImageDraw
d, tag = sys.argv[1], sys.argv[2]
files = sorted(glob.glob(os.path.join(d, f'{tag}_*.jpg')))
os.makedirs(os.path.join(d, 'sheets'), exist_ok=True)
cols = 6 if tag == 'portrait' else 4
for n in range(0, len(files), 12):
    chunk = files[n:n + 12]
    ims = [Image.open(f).convert('RGB') for f in chunk]
    w, h = ims[0].size
    s = 2400 / (w * cols)
    tw, th = int(w * s), int(h * s)
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new('RGB', (tw * cols, th * rows), (24, 24, 24))
    dr = ImageDraw.Draw(sheet)
    for i, (im, f) in enumerate(zip(ims, chunk)):
        x, y = (i % cols) * tw, (i // cols) * th
        sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y))
        t = os.path.basename(f)[len(tag) + 1:-4].lstrip('0') or '0'
        if t.startswith('.'): t = '0' + t
        dr.rectangle([x, y, x + 70, y + 20], fill=(0, 0, 0))
        dr.text((x + 6, y + 4), f't={t}s', fill=(255, 220, 120))
    sheet.save(os.path.join(d, 'sheets', f'{tag}_{n // 12 + 1:02d}.jpg'), quality=86)
print('sheets done', tag, len(files))
