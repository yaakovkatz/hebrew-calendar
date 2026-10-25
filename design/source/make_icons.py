"""Builds the Android icon set from the user's final artwork, without changing it.

The artwork is a calendar page on a white margin. The white margin is removed, and the
page itself becomes the icon: Android's mask (circle, squircle) cuts straight into it.
Behind the artwork, the background layer only continues the page's own colours (brown
binding on top, paper below), so nothing new shows if a mask reaches past its edges.

Outputs (1024x1024) into <out_dir>:
  icon.png                     full-bleed square (Play Store / legacy icon)
  android-icon-foreground.png  the artwork, transparent around it, sized to the visible area
  android-icon-background.png  the page's two colours, split where the binding meets the paper

Usage: python make_icons.py <artwork> <out_dir>
"""
import sys
from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
art = Image.open(src).convert("RGBA")

# Remove the white margin: flood-fill it from the corners to transparent.
for corner in [(0, 0), (art.width - 1, 0), (0, art.height - 1), (art.width - 1, art.height - 1)]:
    ImageDraw.floodfill(art, corner, (0, 0, 0, 0), thresh=40)
art = art.crop(art.getbbox())

# Where the binding ends and the paper starts, along the centre column.
cx = art.width // 2
rows = [art.getpixel((cx, y)) for y in range(art.height)]
split = next(y for y in range(art.height // 5, art.height) if sum(rows[y][:3]) > 600)
binding = rows[split // 2][:3]
paper = rows[split + (art.height - split) // 2][:3]
print("binding", binding, "paper", paper, "split", split / art.height)


def layered(art_size: int) -> tuple[Image.Image, Image.Image]:
    """Background (two colours) and foreground (artwork centred) for a given artwork size."""
    fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    scaled = art.resize((art_size, round(art.height * art_size / art.width)), Image.LANCZOS)
    top = (1024 - scaled.height) // 2
    fg.paste(scaled, ((1024 - art_size) // 2, top), scaled)
    bg = Image.new("RGB", (1024, 1024), paper)
    split_y = top + round(split * scaled.height / art.height)
    ImageDraw.Draw(bg).rectangle((0, 0, 1023, split_y), fill=binding)
    return bg, fg


# Launchers show the central 72/108 of an adaptive icon; the artwork fills that area.
bg, fg = layered(round(1024 * 72 / 108) + 24)
bg.save(f"{out}/android-icon-background.png")
fg.save(f"{out}/android-icon-foreground.png")

# Play Store icon: the artwork fills the whole square.
bg_full, fg_full = layered(1000)
Image.alpha_composite(bg_full.convert("RGBA"), fg_full).convert("RGB").save(f"{out}/icon.png")
print("ok")
