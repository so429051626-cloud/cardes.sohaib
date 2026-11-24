# luma/saturation stats vs the brief (4.2): mean luma 0.578, p2 34, p50 151, p98 219, mean sat 0.079
import sys, numpy as np
from PIL import Image
rows = []
for f in sys.argv[1:]:
    a = np.asarray(Image.open(f).convert('RGB')).astype(np.float32) / 255
    y = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    mx = a.max(-1); mn = a.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    p = np.percentile(y * 255, [2, 50, 98])
    rows.append((f.split('/')[-1], y.mean(), *p, sat.mean()))
    print('%-22s luma %.3f  p2 %5.1f p50 %5.1f p98 %5.1f  sat %.3f' % rows[-1])
if len(rows) > 1:
    m = np.array([r[1:] for r in rows]).mean(0)
    print('%-22s luma %.3f  p2 %5.1f p50 %5.1f p98 %5.1f  sat %.3f' % ('MEAN', *m))
print('target                 luma 0.578  p2  34.0 p50 151.0 p98 219.0  sat 0.079')
