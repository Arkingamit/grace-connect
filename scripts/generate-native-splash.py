"""Build cream-branded native splash assets for Android + iOS."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CREAM = (250, 247, 242, 255)
MAROON = (139, 35, 35, 255)
WARM = (122, 97, 80, 255)

LOGO_WORDMARK = ROOT / "public" / "logo2.png"
LOGO_ICON = ROOT / "assets" / "icon.png"


def knock_out_black(im: Image.Image, threshold: int = 28) -> Image.Image:
    im = im.convert("RGBA")
    pixels = im.load()
    width, height = im.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            if r < threshold and g < threshold and b < threshold:
                pixels[x, y] = (0, 0, 0, 0)
    return im


def fit_on_canvas(src: Image.Image, canvas_size: tuple[int, int], max_ratio: float) -> Image.Image:
    canvas = Image.new("RGBA", canvas_size, CREAM)
    max_w = int(canvas_size[0] * max_ratio)
    max_h = int(canvas_size[1] * max_ratio)
    src = src.convert("RGBA")
    src.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
    x = (canvas_size[0] - src.width) // 2
    y = (canvas_size[1] - src.height) // 2
    canvas.alpha_composite(src, (x, y))
    return canvas


def add_tagline(canvas: Image.Image, text: str = "Where hearts unite") -> Image.Image:
    draw = ImageDraw.Draw(canvas)
    font_size = max(22, canvas.width // 42)
    font = None
    for name in ("segoeuii.ttf", "SegoeUI-Italic.ttf", "ariali.ttf", "arial.ttf"):
        try:
            font = ImageFont.truetype(name, font_size)
            break
        except OSError:
            continue
    if font is None:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (canvas.width - tw) // 2
    y = int(canvas.height * 0.62)
    draw.text((x, y), text, font=font, fill=WARM)
    return canvas


def padded_icon(src: Image.Image, size: int, pad_ratio: float = 0.22) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), CREAM)
    inner = int(size * (1 - pad_ratio * 2))
    icon = knock_out_black(src)
    icon.thumbnail((inner, inner), Image.Resampling.LANCZOS)
    x = (size - icon.width) // 2
    y = (size - icon.height) // 2
    canvas.alpha_composite(icon, (x, y))
    return canvas


def save_png(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "PNG", optimize=True)


def main() -> None:
    wordmark = Image.open(LOGO_WORDMARK)
    icon = Image.open(LOGO_ICON)

    android_res = ROOT / "android" / "app" / "src" / "main" / "res"
    save_png(padded_icon(icon, 960), android_res / "drawable-xxxhdpi" / "splash_icon.png")
    save_png(padded_icon(icon, 720), android_res / "drawable-xxhdpi" / "splash_icon.png")
    save_png(padded_icon(icon, 480), android_res / "drawable-xhdpi" / "splash_icon.png")
    save_png(padded_icon(icon, 360), android_res / "drawable-hdpi" / "splash_icon.png")
    save_png(padded_icon(icon, 240), android_res / "drawable-mdpi" / "splash_icon.png")

    wordmark_asset = fit_on_canvas(wordmark, (1200, 675), 0.92)
    save_png(wordmark_asset, android_res / "drawable" / "splash_wordmark.png")

    # Cream full-bleed fallback used by older windowBackground.
    save_png(add_tagline(fit_on_canvas(wordmark, (1080, 1920), 0.72)), android_res / "drawable-port-xxhdpi" / "splash.png")
    save_png(add_tagline(fit_on_canvas(wordmark, (1080, 1920), 0.72)), android_res / "drawable-port-night-xxhdpi" / "splash.png")
    save_png(add_tagline(fit_on_canvas(wordmark, (720, 1280), 0.72)), android_res / "drawable-port-xhdpi" / "splash.png")
    save_png(add_tagline(fit_on_canvas(wordmark, (720, 1280), 0.72)), android_res / "drawable-port-night-xhdpi" / "splash.png")
    save_png(add_tagline(fit_on_canvas(wordmark, (1080, 1920), 0.72)), android_res / "drawable-night" / "splash.png")
    save_png(add_tagline(fit_on_canvas(wordmark, (1080, 1920), 0.72)), android_res / "drawable" / "splash.png")

    ios_set = ROOT / "ios" / "App" / "App" / "Assets.xcassets" / "Splash.imageset"
    ios_full = add_tagline(fit_on_canvas(wordmark, (2732, 2732), 0.58))
    for name in (
        "Default@1x~universal~anyany.png",
        "Default@2x~universal~anyany.png",
        "Default@3x~universal~anyany.png",
        "Default@1x~universal~anyany-dark.png",
        "Default@2x~universal~anyany-dark.png",
        "Default@3x~universal~anyany-dark.png",
        "splash-2732x2732.png",
        "splash-2732x2732-1.png",
        "splash-2732x2732-2.png",
    ):
        save_png(ios_full, ios_set / name)

    web = add_tagline(fit_on_canvas(wordmark, (1200, 1800), 0.7))
    save_png(web, ROOT / "public" / "splash-brand.png")
    print("Native splash assets generated.")


if __name__ == "__main__":
    main()
