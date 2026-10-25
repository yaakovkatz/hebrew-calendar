"""Builds the app icon set from the user's artwork.

icon.png              1024x1024, the artwork as-is (Play Store / legacy icon)
android-icon-foreground.png  1024x1024, artwork shrunk into Android's adaptive safe zone
android-icon-background.png  1024x1024, flat background sampled from the artwork's corner
splash-icon.png       1024x1024, same as foreground (Expo centers it on the splash color)
"""
import sys
from PIL import Image

src, out_dir = sys.argv[1], sys.argv[2]
art = Image.open(src).convert("RGBA")
w, h = art.size
side = min(w, h)
art = art.crop(((w - side) // 2, (h - side) // 2, (w + side) // 2, (h + side) // 2)).resize((1024, 1024), Image.LANCZOS)

bg_color = art.getpixel((8, 8))[:3]
print("background", "#%02X%02X%02X" % bg_color)

art.convert("RGB").save(f"{out_dir}/icon.png")

# Android masks the outer third; keep the artwork inside the central ~66%.
fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
inner = art.resize((860, 860), Image.LANCZOS)
fg.paste(inner, (82, 82), inner)
fg.save(f"{out_dir}/android-icon-foreground.png")
Image.new("RGB", (1024, 1024), bg_color).save(f"{out_dir}/android-icon-background.png")

