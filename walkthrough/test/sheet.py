# contact sheet: python3 sheet.py out.jpg cols img1 img2 ... (labels = file names)
import sys
from PIL import Image, ImageDraw
out, cols, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims = [Image.open(f).convert('RGB') for f in files]
w, h = ims[0].size
s = 1.0
if w * cols > 2400: s = 2400 / (w * cols)
tw, th = int(w * s), int(h * s)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (tw * cols, th * rows), (30, 30, 30))
d = ImageDraw.Draw(sheet)
for i, (im, f) in enumerate(zip(ims, files)):
    x, y = (i % cols) * tw, (i // cols) * th
    sheet.paste(im.resize((tw, th)), (x, y))
    d.rectangle([x, y, x + 110, y + 18], fill=(0, 0, 0))
    d.text((x + 4, y + 3), f.split('/')[-1][:-4], fill=(255, 255, 0))
sheet.save(out, quality=88)
