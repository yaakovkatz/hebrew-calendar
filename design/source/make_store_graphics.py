"""Play Store graphics: 512x512 icon and a 1024x500 feature graphic, in the splash style
(name, three dots, short tagline on paper). Hebrew is reversed by hand (no libraqm).

Usage: python make_store_graphics.py <serif.ttf> <sans.ttf> <icon.png> <out dir>
"""
import sys
from PIL import Image, ImageDraw, ImageFont

serif, sans, icon, out = sys.argv[1:5]
PAPER, INK, MUTED, RED, DOT = "#F6F0E4", "#2B2118", "#9A8B73", "#A32D2D", "#D9CDB6"

Image.open(icon).convert("RGB").resize((512, 512), Image.LANCZOS).save(f"{out}/icon-512.png")

img = Image.new("RGB", (1024, 500), PAPER)
d = ImageDraw.Draw(img)
art = Image.open(icon).convert("RGBA").resize((300, 300), Image.LANCZOS)
mask = Image.new("L", art.size, 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, 299, 299), radius=66, fill=255)
img.paste(art, (640, 100), mask)

def center_x(text, font, cx):
    w = d.textlength(text, font=font)
    return cx - w / 2

name = "לוח יהודי"[::-1]
f1 = ImageFont.truetype(serif, 112)
cx = 330
d.text((center_x(name, f1, cx), 120), name, font=f1, fill=INK)
for i, c in enumerate((DOT, RED, DOT)):
    x, y, r = cx + (i - 1) * 30, 290, 7
    d.ellipse((x - r, y - r, x + r, y + r), fill=c)
tag = "זמנים · ימי משפחה · לוח קיר"
f2 = ImageFont.truetype(sans, 34)
parts = [p[::-1] for p in tag.split(" · ")][::-1]
line = " · ".join(parts)
d.text((center_x(line, f2, cx), 330), line, font=f2, fill=MUTED)
img.save(f"{out}/feature-graphic.png")
