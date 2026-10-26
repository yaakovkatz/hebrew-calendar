"""Widget-picker preview images (PLAN.md, "סבב 1" item 5; design/screens.html mockup 6).

Each image draws the real widget layout from src/widgets/Widgets.tsx with sample content,
light palette, on a transparent background with rounded corners.

Pillow without libraqm lays text out left to right, so `visual()` reorders by hand:
Hebrew runs are reversed, digit runs (16:51) keep their order, and the run order flips.

Run from the repo root:  python design/source/make_widget_previews.py
"""
import os
import re

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FONTS = os.path.join(ROOT, "node_modules", "@expo-google-fonts")
SERIF = os.path.join(FONTS, "frank-ruhl-libre", "400Regular", "FrankRuhlLibre_400Regular.ttf")
SANS = os.path.join(FONTS, "heebo", "400Regular", "Heebo_400Regular.ttf")
OUT = os.path.join(ROOT, "assets", "widgets")

PAPER = "#F6F0E4"
INK = "#2B2118"
RED = "#A32D2D"
SUN = "#B5651D"
MUTED = "#9A8B73"
TODAY = "#EADFC8"

S = 4  # pixels per dp
RADIUS = 16  # dp, same as the widget Card


def visual(text):
    """Logical RTL text -> left-to-right drawing order (digits stay as they are)."""
    parts = re.split(r"([0-9][0-9:]*)", text)
    return "".join(p if re.match(r"[0-9]", p) else p[::-1] for p in reversed(parts))


_font_cache = {}


def font(path, size_dp):
    key = (path, size_dp)
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(path, int(size_dp * S))
    return _font_cache[key]


class Canvas:
    def __init__(self, w_dp, h_dp):
        self.w, self.h = w_dp, h_dp
        self.img = Image.new("RGBA", (w_dp * S, h_dp * S), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.img)
        self.d.rounded_rectangle((0, 0, w_dp * S - 1, h_dp * S - 1), radius=RADIUS * S, fill=PAPER)

    def text(self, x_dp, y_dp, text, path, size_dp, fill, anchor="r"):
        """anchor r/l/c: x is the right edge, left edge or center; y is the top of the line box."""
        f = font(path, size_dp)
        s = visual(text)
        width = self.d.textlength(s, font=f)
        x = x_dp * S
        if anchor == "r":
            x -= width
        elif anchor == "c":
            x -= width / 2
        # 'la' = left/ascender, so y is the top of the line like a TextWidget
        self.d.text((x, y_dp * S), s, font=f, fill=fill, anchor="la")
        return y_dp + size_dp * 1.35  # next line

    def save(self, name):
        os.makedirs(OUT, exist_ok=True)
        self.img.save(os.path.join(OUT, name), optimize=True)


def hebrew_date():
    c = Canvas(110, 110)
    cx = 55
    c.text(cx, 14, "שני", SANS, 12, MUTED, "c")
    c.text(cx, 30, "ט״ו", SERIF, 44, INK, "c")
    c.text(cx, 82, "חשוון", SERIF, 16, INK, "c")
    c.save("HebrewDate.png")


def next_up():
    c = Canvas(110, 110)
    right = 110 - 14
    c.text(right, 14, "מחר", SANS, 12, MUTED)
    c.text(right, 36, "רופא", SERIF, 19, INK)
    c.text(right, 60, "שיניים", SERIF, 19, INK)
    c.save("NextUp.png")


def zmanim_shabbat():
    c = Canvas(250, 110)
    right, left = 250 - 14, 14
    c.text(right, 14, "הזמן הבא", SANS, 12, MUTED)
    c.text(right, 33, "שקיעה", SERIF, 18, INK)
    c.text(right, 58, "16:51", SERIF, 26, SUN)
    c.text(left, 14, "שבת וירא", SANS, 12, MUTED, "l")
    c.text(left, 36, "נרות 16:11", SERIF, 16, RED, "l")
    c.text(left, 60, "צאת 17:26", SERIF, 16, INK, "l")
    c.save("ZmanimShabbat.png")


def month():
    # חשוון תשפ״ז: 1 Cheshvan is a Monday, 30 days; today = ט״ו.
    c = Canvas(250, 250)
    pad = 10
    c.text(125, pad, "חשוון תשפ״ז", SERIF, 16, INK, "c")
    gem = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "יא", "יב", "יג", "יד", "טו",
           "טז", "יז", "יח", "יט", "כ", "כא", "כב", "כג", "כד", "כה", "כו", "כז", "כח", "כט", "ל"]
    first_weekday, days, today = 1, 30, 15
    inner = 250 - 2 * pad
    col_w = inner / 7

    def col_center(i):  # i = 0 (Sunday) on the right
        return 250 - pad - col_w * (i + 0.5)

    head_top = pad + 26
    for i, w in enumerate(["א", "ב", "ג", "ד", "ה", "ו", "ש"]):
        c.text(col_center(i), head_top + 3, w, SANS, 11, RED if i == 6 else MUTED, "c")
    rows = (first_weekday + days + 6) // 7
    grid_top = head_top + 22 + 2
    row_h = (250 - pad - grid_top) / rows
    for day in range(1, days + 1):
        idx = first_weekday + day - 1
        r, i = divmod(idx, 7)
        top = grid_top + r * row_h
        cx = col_center(i)
        if day == today:
            c.d.rounded_rectangle(
                ((cx - col_w / 2 + 1) * S, (top + 1) * S, (cx + col_w / 2 - 1) * S, (top + row_h - 1) * S),
                radius=8 * S, fill=TODAY)
        c.text(cx, top + (row_h - 14 * 1.35) / 2, gem[day - 1], SERIF, 14, RED if i == 6 else INK, "c")
    c.save("Month.png")


if __name__ == "__main__":
    hebrew_date()
    next_up()
    zmanim_shabbat()
    month()
    print("wrote", OUT)
