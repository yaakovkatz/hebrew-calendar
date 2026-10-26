"""Store screenshots from raw phone captures (720x1600): drop the status bar and the gesture
bar, pad the sides with paper so the ratio is at most 2:1 (Play's limit), and scale up 1.5x.

Usage: python make_store_screenshots.py <in dir> <out dir>
"""
import glob, os, sys
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
PAPER = (246, 240, 228)
for path in sorted(glob.glob(os.path.join(src, "*.png"))):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    top, bottom = int(h * 0.05), int(h * 0.03)  # status bar, gesture bar
    body = im.crop((0, top, w, h - bottom))
    bh = body.height
    nw = max(w, (bh + 1) // 2)
    canvas = Image.new("RGB", (nw, bh), PAPER)
    canvas.paste(body, ((nw - w) // 2, 0))
    canvas = canvas.resize((int(nw * 1.5), int(bh * 1.5)), Image.LANCZOS)
    canvas.save(os.path.join(out, os.path.basename(path)))
    print(os.path.basename(path), canvas.size, round(canvas.height / canvas.width, 3))
