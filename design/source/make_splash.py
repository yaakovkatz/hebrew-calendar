"""Splash image from the approved design: "לוח יהודי" with a thin rule and ✦ under it.

Pillow without libraqm lays text out left to right, so the Hebrew string is reversed
by hand (pure Hebrew, no numbers or Latin, so a plain reversal is correct).
"""
import sys
from PIL import Image, ImageDraw, ImageFont

font_path, out_light, out_dark = sys.argv[1], sys.argv[2], sys.argv[3]


def draw(path, ink, red, line):
    img = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(font_path, 150)
    text = "לוח יהודי"[::-1]
    box = d.textbbox((0, 0), text, font=font)
    tw, th = box[2] - box[0], box[3] - box[1]
    d.text(((1024 - tw) / 2 - box[0], 380 - box[1]), text, font=font, fill=ink)
    y = 380 + th + 70
    d.line((322, y, 482, y), fill=line, width=3)
    d.line((542, y, 702, y), fill=line, width=3)
    # four-point star
    s = 18
    d.polygon([(512, y - s), (518, y - 6), (512 + s, y), (518, y + 6), (512, y + s), (506, y + 6), (512 - s, y), (506, y - 6)], fill=red)
    img.save(path)


draw(out_light, "#2B2118", "#A32D2D", "#D9CDB6")
draw(out_dark, "#EDE4D3", "#E8806F", "#3A3328")
