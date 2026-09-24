"""Build Android + iOS launcher and notification icons from src/assets/logo.png."""
from pathlib import Path
from PIL import Image

ROOT = Path(r"e:\grace-connect")
SRC = ROOT / "src" / "assets" / "logo.png"
RES = ROOT / "android" / "app" / "src" / "main" / "res"
IOS_ICON = ROOT / "ios" / "App" / "App" / "Assets.xcassets" / "AppIcon.appiconset" / "AppIcon-512@2x.png"
CLEAR = (0, 0, 0, 0)
LAUNCHER = {
    "mipmap-ldpi": 36,
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
FOREGROUND = {
    "mipmap-ldpi": 81,
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}
NOTIFY = {
    "drawable-mdpi": 24,
    "drawable-hdpi": 36,
    "drawable-xhdpi": 48,
    "drawable-xxhdpi": 72,
    "drawable-xxxhdpi": 96,
}
SPLASH = {
    "drawable": 240,
    "drawable-mdpi": 240,
    "drawable-hdpi": 360,
    "drawable-xhdpi": 480,
    "drawable-xxhdpi": 720,
    "drawable-xxxhdpi": 960,
}


def crop_logo(im: Image.Image) -> Image.Image:
    px = im.load()
    w, h = im.size
    minx, miny, maxx, maxy = w, h, 0, 0
    found = False
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 16:
                continue
            found = True
            if x < minx:
                minx = x
            if y < miny:
                miny = y
            if x > maxx:
                maxx = x
            if y > maxy:
                maxy = y
    if not found:
        return im
    return im.crop((minx, miny, maxx + 1, maxy + 1))


def fit(im: Image.Image, size: int, bg, fill=0.88) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), bg)
    target = max(1, int(size * fill))
    w, h = im.size
    scale = target / max(w, h)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas.paste(resized, ((size - nw) // 2, (size - nh) // 2), resized)
    return canvas


def silhouette(im: Image.Image) -> Image.Image:
    out = Image.new("RGBA", im.size, (255, 255, 255, 0))
    src = im.load()
    dst = out.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            if a < 20:
                continue
            if r > 248 and g > 248 and b > 248:
                continue
            dst[x, y] = (255, 255, 255, 255)
    return out


def save_png(im: Image.Image, path: Path, rgb=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    if rgb:
        im.convert("RGB").save(path, "PNG")
    else:
        im.save(path, "PNG")


logo = crop_logo(Image.open(SRC).convert("RGBA"))
mask = silhouette(logo)

for folder, size in LAUNCHER.items():
    icon = fit(logo, size, CLEAR, 0.92)
    save_png(icon, RES / folder / "ic_launcher.png")
    save_png(icon, RES / folder / "ic_launcher_round.png")
    save_png(Image.new("RGBA", (size, size), CLEAR), RES / folder / "ic_launcher_background.png")

for folder, size in FOREGROUND.items():
    fg = fit(logo, size, CLEAR, 0.86)
    save_png(fg, RES / folder / "ic_launcher_foreground.png")

for folder, size in NOTIFY.items():
    icon = fit(mask, size, CLEAR, 0.9)
    save_png(icon, RES / folder / "ic_stat_icon.png")

save_png(fit(mask, 24, CLEAR, 0.9), RES / "drawable" / "ic_stat_icon.png")

for folder, size in SPLASH.items():
    save_png(fit(logo, size, CLEAR, 0.78), RES / folder / "splash_icon.png")

save_png(fit(logo, 1024, CLEAR, 0.9), IOS_ICON)
print("icons generated")
