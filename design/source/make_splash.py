"""Splash images from the approved design (26.10.2026, option 3): "לוח יהודי" with three dots
under it (the middle one red), and "לוח עברי" small at the bottom (Android 12+ branding image).

Pillow without libraqm lays text out left to right, so the Hebrew strings are reversed
by hand (pure Hebrew, no numbers or Latin, so a plain reversal is correct).

Usage: python make_splash.py <serif.ttf> <sans.ttf> <assets dir>
"""
import sys
from PIL import Image, ImageDraw, ImageFont

serif, sans, out = sys.argv[1], sys.argv[2], sys.argv[3]


def logo(path, ink, red, dot):
    img = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(serif, 150)
    text = "לוח יהודי"[::-1]
    box = d.textbbox((0, 0), text, font=font)
    tw, th = box[2] - box[0], box[3] - box[1]
    top = 400
    d.text(((1024 - tw) / 2 - box[0], top - box[1]), text, font=font, fill=ink)
    y, r, gap = top + th + 70, 9, 40
    for i, c in enumerate((dot, red, dot)):
        x = 512 + (i - 1) * gap
        d.ellipse((x - r, y - r, x + r, y + r), fill=c)
    img.save(path)


def branding(path, color):
    # Android draws the branding image at 200x80dp; 3x for sharp text.
    img = Image.new("RGBA", (600, 240), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(sans, 42)
    # Letter-spaced like the mockup: a thin space between letters.
    letters = list("לוח עברי"[::-1])
    widths = [d.textlength(ch, font=font) for ch in letters]
    spacing = 12
    total = sum(widths) + spacing * (len(letters) - 1)
    x = (600 - total) / 2
    for ch, w in zip(letters, widths):
        d.text((x, 100), ch, font=font, fill=color)
        x += w + spacing
    img.save(path)


logo(f"{out}/splash-light.png", "#2B2118", "#A32D2D", "#D9CDB6")
logo(f"{out}/splash-dark.png", "#EDE4D3", "#E8806F", "#3A3328")
branding(f"{out}/splash-branding-light.png", "#9A8B73")
branding(f"{out}/splash-branding-dark.png", "#8C8170")
