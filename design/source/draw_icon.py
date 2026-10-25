"""Draws the app icon in the app's own palette, based on the user's calendar-page artwork.

Full-bleed: the brown background fills the whole square, so Android's mask (circle,
squircle) cuts straight into it and there is no white ring around the icon.

Outputs (1024x1024):
  icon.png                     background + calendar (Play Store / legacy icon)
  android-icon-background.png  background only
  android-icon-foreground.png  calendar only, transparent, inside the adaptive safe zone

Usage: python draw_icon.py <FrankRuhlLibre_500Medium.ttf> <out_dir>
"""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT, OUT = sys.argv[1], sys.argv[2]
S = 2048  # draw at 2x, downsample for smooth edges

PAPER = (246, 240, 228)
INK = (43, 33, 24)
RED = (163, 45, 45)
SUN = (181, 101, 29)
TOP = (196, 124, 52)     # warm light corner of the background
BOTTOM = (58, 36, 20)    # deep ink-brown corner


def background() -> Image.Image:
    """Diagonal gradient from warm sun-brown to deep ink-brown."""
    img = Image.new("RGB", (S, S))
    px = img.load()
    for y in range(S):
        for x in range(S):
            t = (x + y) / (2 * S)
            px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(TOP, BOTTOM))
    return img


def calendar(scale: float) -> Image.Image:
    """The page, binding and rings, centred on a transparent canvas; `scale` sizes it."""
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    w, h = 1200 * scale, 1180 * scale
    x0, y0 = (S - w) / 2, (S - h) / 2 + 40 * scale
    r = 120 * scale

    # soft shadow under the whole calendar
    shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((x0 + 30 * scale, y0 + 60 * scale, x0 + w + 30 * scale, y0 + h + 60 * scale), r, fill=(20, 10, 4, 120))
    layer = Image.alpha_composite(layer, shadow.filter(ImageFilter.GaussianBlur(40 * scale)))
    d = ImageDraw.Draw(layer)

    # binding (top band) and page
    d.rounded_rectangle((x0, y0, x0 + w, y0 + h), r, fill=INK)
    page_top = y0 + 260 * scale
    d.rounded_rectangle((x0 + 20 * scale, page_top, x0 + w - 20 * scale, y0 + h - 20 * scale), r - 20 * scale, fill=PAPER)

    # folded corner bottom-right, as in the user's artwork
    c = 250 * scale
    cx, cy = x0 + w - 20 * scale, y0 + h - 20 * scale
    d.polygon([(cx - c, cy), (cx, cy - c), (cx, cy)], fill=INK)
    d.polygon([(cx - c, cy), (cx, cy - c), (cx - c * 0.86, cy - c * 0.86)], fill=SUN)
    d.line([(cx - c, cy), (cx, cy - c)], fill=(140, 76, 22), width=int(8 * scale))

    # rings
    for rx in (x0 + w * 0.3, x0 + w * 0.7):
        d.rounded_rectangle((rx - 55 * scale, y0 - 120 * scale, rx + 55 * scale, y0 + 150 * scale), 55 * scale, fill=PAPER)
        d.rounded_rectangle((rx - 55 * scale, y0 + 90 * scale, rx + 55 * scale, y0 + 150 * scale), 30 * scale, fill=INK)

    # text: Pillow lays out left to right, so pure-Hebrew strings are reversed by hand
    big = ImageFont.truetype(FONT, int(430 * scale))
    small = ImageFont.truetype(FONT, int(170 * scale))
    mid = S / 2
    for text, font, y in (("לוח"[::-1], big, page_top + 120 * scale), ("יהודי"[::-1], small, page_top + 640 * scale)):
        box = d.textbbox((0, 0), text, font=font)
        d.text((mid - (box[2] - box[0]) / 2 - box[0], y - box[1]), text, font=font, fill=INK)

    # rule and diamond between the words
    ry = page_top + 575 * scale
    d.line((mid - 330 * scale, ry, mid - 60 * scale, ry), fill=SUN, width=int(10 * scale))
    d.line((mid + 60 * scale, ry, mid + 330 * scale, ry), fill=SUN, width=int(10 * scale))
    k = 34 * scale
    d.polygon([(mid, ry - k), (mid + k, ry), (mid, ry + k), (mid - k, ry)], fill=RED)
    return layer


bg = background()
full = Image.alpha_composite(bg.convert("RGBA"), calendar(1.0))
full.convert("RGB").resize((1024, 1024), Image.LANCZOS).save(f"{OUT}/icon.png")
bg.resize((1024, 1024), Image.LANCZOS).save(f"{OUT}/android-icon-background.png")
# Android masks roughly the outer third, so the adaptive foreground is drawn smaller.
calendar(0.70).resize((1024, 1024), Image.LANCZOS).save(f"{OUT}/android-icon-foreground.png")
print("ok")
