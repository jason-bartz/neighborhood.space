"""Generate OG images for all GNF chapter pages + main site.

Output: public/assets/og-{slug}.png at 1200x630.
All five use the same pennant hero photo on the left; the right
paper block carries chapter-specific content. Footer band shows
the gnf logo (no text wordmark) and the chapter's SINCE chip.
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

ROOT = Path("/Users/jasonbartz/GNF neighborhood-os")
PUBLIC = ROOT / "public"
ASSETS = PUBLIC / "assets"

MB_MAGENTA      = (0xE9, 0x3A, 0x7D)
MB_MAGENTA_DEEP = (0xC2, 0x1D, 0x61)
MB_PAPER        = (0xFA, 0xF4, 0xE3)
MB_INK          = (0x14, 0x14, 0x19)
MB_CHALK        = (0xFF, 0xFF, 0xFF)
MB_BUTTER       = (0xF0, 0xC9, 0x4B)

W, H = 1200, 630

BASKERVILLE = "/System/Library/Fonts/Supplemental/Baskerville.ttc"
HELV_NEUE   = "/System/Library/Fonts/HelveticaNeue.ttc"
PIXELIFY    = str(ASSETS / "fonts" / "pixelify-sans.ttf")
HERO_PHOTO  = ASSETS / "fat-daddys.webp"
LOGO        = PUBLIC / "logo.png"

def font(path, size, index=0):
    try:
        return ImageFont.truetype(path, size, index=index)
    except Exception:
        return ImageFont.truetype(path, size)


# Chapter content. All share the same photo now; differentiation is
# in the eyebrow, lede, and SINCE year.
CHAPTERS = {
    "upstate": {
        "eyebrow":     "UPSTATE   NEW   YORK",
        "lede_1":      "Belief capital for early-stage founders",
        "lede_2":      "across Syracuse, Ithaca, Binghamton & Utica.",
        "since":       "SINCE 2026",
    },
    "capital-region": {
        "eyebrow":     "NY   CAPITAL   REGION",
        "lede_1":      "Belief capital for early-stage founders",
        "lede_2":      "across Albany, Schenectady, Troy & Saratoga.",
        "since":       "SINCE 2026",
    },
    "wny": {
        "eyebrow":     "WESTERN   NEW   YORK",
        "lede_1":      "Belief capital for early-stage founders",
        "lede_2":      "across Buffalo and Western New York.",
        "since":       "SINCE 2023",
    },
    "denver": {
        "eyebrow":     "DENVER,   COLORADO",
        "lede_1":      "Belief capital for early-stage founders",
        "lede_2":      "across Denver and the Front Range.",
        "since":       "SINCE 2023",
    },
    "default": {
        "eyebrow":     "GOOD   NEIGHBOR   FUND",
        "lede_1":      "Micro-grants for early-stage founders —",
        "lede_2":      "no pitch deck, no equity, just belief.",
        "since":       "SINCE 2023",
    },
}


def build_og(slug, cfg):
    out = ASSETS / f"og-{slug}.png"

    f_amount   = font(BASKERVILLE, 120, index=4)  # Bold
    f_tail     = font(BASKERVILLE, 32, index=1)   # Italic
    f_idea     = font(BASKERVILLE, 72, index=1)   # Italic
    f_lede     = font(HELV_NEUE, 22)
    f_pixel    = font(PIXELIFY, 18)
    f_tag      = font(PIXELIFY, 16)

    canvas = Image.new("RGB", (W, H), MB_PAPER)
    draw = ImageDraw.Draw(canvas)

    # --- Left photo panel -------------------------------------------
    # Cover-fit: scale by whichever dimension is more constraining so
    # the photo fills the 660x630 slot, then center-crop the overflow.
    # Works for both landscape and portrait source photos.
    PHOTO_W = 660
    photo = Image.open(HERO_PHOTO).convert("RGB")
    pw, ph = photo.size
    scale = max(PHOTO_W / pw, H / ph)
    new_w, new_h = int(pw * scale + 0.5), int(ph * scale + 0.5)
    photo_resized = photo.resize((new_w, new_h), Image.LANCZOS)
    crop_x = max(0, (new_w - PHOTO_W) // 2)
    crop_y = max(0, (new_h - H) // 2)
    photo_cropped = photo_resized.crop(
        (crop_x, crop_y, crop_x + PHOTO_W, crop_y + H)
    )

    # Very subtle warm lift for palette cohesion
    warm = Image.new("RGB", (PHOTO_W, H), (255, 220, 170))
    photo_cropped = Image.blend(photo_cropped, warm, 0.03)

    canvas.paste(photo_cropped, (0, 0))

    DIVIDER_X = PHOTO_W
    draw.rectangle([DIVIDER_X - 2, 0, DIVIDER_X, H], fill=MB_INK)

    # --- Right content block ----------------------------------------
    PAD_L = PHOTO_W + 44
    PAD_R = 44
    PAD_T = 48

    # Pixel eyebrow + magenta marker
    draw.rectangle([PAD_L, PAD_T + 4, PAD_L + 18, PAD_T + 22], fill=MB_MAGENTA)
    draw.text((PAD_L + 30, PAD_T), cfg["eyebrow"], fill=MB_INK, font=f_pixel)

    rule_y = PAD_T + 36
    draw.rectangle([PAD_L, rule_y, W - PAD_R, rule_y + 1], fill=MB_INK)

    # "$1,000" bold serif
    y = rule_y + 18
    amount_w = draw.textlength("$1,000", font=f_amount)
    draw.text((PAD_L, y), "$1,000", fill=MB_INK, font=f_amount)
    # "for your" italic tag
    draw.text((PAD_L + amount_w + 14, y + 52), "for your",
              fill=MB_MAGENTA_DEEP, font=f_tail)

    # "big idea."
    y2 = y + 108
    draw.text((PAD_L, y2), "big idea.", fill=MB_INK, font=f_idea)

    # Lede
    y3 = y2 + 100
    draw.text((PAD_L, y3), cfg["lede_1"], fill=(48, 48, 56), font=f_lede)
    draw.text((PAD_L, y3 + 30), cfg["lede_2"], fill=(48, 48, 56), font=f_lede)

    # --- Magenta footer band ----------------------------------------
    BAND_H = 76
    band_y = H - BAND_H
    draw.rectangle([DIVIDER_X, band_y, W, H], fill=MB_MAGENTA)
    draw.rectangle([DIVIDER_X, band_y - 2, W, band_y], fill=MB_INK)

    # Paste the logo into the band (replaces gnf + wordmark text).
    # Logo has transparent background, so composite via alpha.
    logo = Image.open(LOGO).convert("RGBA")
    lw, lh = logo.size
    logo_target_h = 56
    logo_scale = logo_target_h / lh
    logo_new_w = int(lw * logo_scale)
    logo_resized = logo.resize((logo_new_w, logo_target_h), Image.LANCZOS)
    logo_x = PAD_L
    logo_y = band_y + (BAND_H - logo_target_h) // 2
    canvas.paste(logo_resized, (logo_x, logo_y), logo_resized)

    # SINCE chip (chalk-bordered)
    chip_text = cfg["since"]
    chip_text_w = draw.textlength(chip_text, font=f_tag)
    chip_w = chip_text_w + 24
    chip_x = W - PAD_R - chip_w
    chip_y = band_y + 24
    draw.rectangle([chip_x, chip_y, chip_x + chip_w, chip_y + 28],
                   outline=MB_CHALK, width=2)
    draw.text((chip_x + 12, chip_y + 6), chip_text, fill=MB_CHALK, font=f_tag)

    # --- Outer ink border -------------------------------------------
    BORDER = 3
    draw.rectangle([0, 0, W - 1, BORDER - 1], fill=MB_INK)
    draw.rectangle([0, H - BORDER, W - 1, H - 1], fill=MB_INK)
    draw.rectangle([0, 0, BORDER - 1, H - 1], fill=MB_INK)
    draw.rectangle([W - BORDER, 0, W - 1, H - 1], fill=MB_INK)

    canvas.save(out, "PNG", optimize=True)
    print(f"  {out.name}  {out.stat().st_size:>8,} bytes")


if __name__ == "__main__":
    for slug, cfg in CHAPTERS.items():
        build_og(slug, cfg)
