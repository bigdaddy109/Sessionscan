#!/usr/bin/env python3
"""Regenerate page-specific 1200×630 OG JPEGs from public/og.jpg.

Why: shell/guide/archive share previews need distinct art from the home card,
but should stay on the same night-scan brand. Run after editing public/og.jpg.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "og.jpg"
OUT_DIR = ROOT / "public"
MAX_BYTES = 300 * 1024

PAGES = [
    ("og-week.jpg", "WEEKLY ARCHIVE", (0, 232, 209)),
    ("og-money.jpg", "MONEY ROUTES", (255, 60, 172)),
    ("og-businesses.jpg", "BUSINESSES", (61, 255, 138)),
    ("og-gta6.jpg", "GTA 6 COUNTDOWN", (255, 45, 149)),
    ("og-about.jpg", "ABOUT", (0, 232, 209)),
]

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
]


def load_font(size: int) -> ImageFont.ImageFont:
    for path in FONT_CANDIDATES:
        if os.path.isfile(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def save_under_cap(img: Image.Image, out: Path) -> tuple[int, int]:
    lo, hi = 60, 92
    best_q, best_size = 55, None
    while lo <= hi:
        q = (lo + hi) // 2
        img.save(out, "JPEG", quality=q, optimize=True, progressive=True)
        size = out.stat().st_size
        if size <= MAX_BYTES:
            best_q, best_size = q, size
            lo = q + 1
        else:
            hi = q - 1
    img.save(out, "JPEG", quality=best_q, optimize=True, progressive=True)
    return best_q, out.stat().st_size


def render_page(base: Image.Image, filename: str, label: str, accent: tuple[int, int, int]) -> None:
    label_font = load_font(42)
    brand_font = load_font(22)
    img = base.copy()
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    bbox = d.textbbox((0, 0), label, font=label_font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad_x, pad_y = 28, 16
    bw, bh = tw + pad_x * 2, th + pad_y * 2
    bx = (1200 - bw) // 2
    by = 400
    d.rounded_rectangle(
        [bx - 4, by - 4, bx + bw + 4, by + bh + 4],
        radius=6,
        fill=(7, 4, 12, 210),
    )
    d.rounded_rectangle(
        [bx, by, bx + bw, by + bh],
        radius=4,
        outline=accent + (255,),
        width=3,
    )
    d.rectangle([bx, by + 6, bx + 6, by + bh - 6], fill=accent + (255,))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(img)
    tx, ty = bx + pad_x + 4, by + pad_y - 2
    draw.text((tx + 1, ty + 1), label, font=label_font, fill=(0, 0, 0))
    draw.text((tx, ty), label, font=label_font, fill=accent)
    marker = "SESSIONSCAN"
    mb = draw.textbbox((0, 0), marker, font=brand_font)
    mw = mb[2] - mb[0]
    draw.text((1200 - mw - 36, 28), marker, font=brand_font, fill=(0, 232, 209))
    out = OUT_DIR / filename
    q, size = save_under_cap(img, out)
    print(f"{filename}: {size} bytes q={q} {img.size}")


def main() -> int:
    if not SRC.is_file():
        print(f"missing {SRC}", file=sys.stderr)
        return 1
    base = Image.open(SRC).convert("RGB")
    if base.size != (1200, 630):
        print(f"expected 1200x630, got {base.size}", file=sys.stderr)
        return 1
    for filename, label, accent in PAGES:
        render_page(base, filename, label, accent)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
