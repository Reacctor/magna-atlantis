"""Split a green-screen character sheet into poses and key out the background.

usage: python keyout.py <sheet.jpg> <out_dir> <id> [poses=idle,talk] [height=600]

Finds the figures as non-green column bands, keys green to alpha with soft edges,
despills green fringes, crops, scales to the target height and writes
<out_dir>/<id>_<pose>.png in left-to-right order.
"""
import sys
from PIL import Image, ImageFilter
import numpy as np


def green_mask(a):
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    # how "green" a pixel is: 0..1
    dom = g - np.maximum(r, b)
    score = np.clip((dom - 20) / 80.0, 0, 1) * np.clip((g - 90) / 60.0, 0, 1)
    return score  # 1 = background green


def key(img):
    a = np.asarray(img.convert("RGB")).astype(np.float32)
    bg = green_mask(a)
    alpha = 1.0 - bg
    # despill: pull green down to the max of red/blue where green dominates
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    lim = np.maximum(r, b)
    spill = (g > lim) & (alpha > 0)
    g2 = np.where(spill, lim, g)
    out = np.dstack([r, g2, b, alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, "RGBA"), alpha


def split_bands(alpha, n, min_gap=12):
    cols = (alpha > 0.5).sum(axis=0)
    on = cols > alpha.shape[0] * 0.01
    bands = []
    start = None
    for x, v in enumerate(on):
        if v and start is None:
            start = x
        elif not v and start is not None:
            bands.append([start, x])
            start = None
    if start is not None:
        bands.append([start, len(on)])
    # merge bands separated by tiny gaps (raised hands etc.)
    merged = []
    for b in bands:
        if merged and b[0] - merged[-1][1] < min_gap:
            merged[-1][1] = b[1]
        else:
            merged.append(b)
    merged = [b for b in merged if b[1] - b[0] > 40]
    # keep the n widest
    merged = sorted(sorted(merged, key=lambda b: b[1] - b[0], reverse=True)[:n])
    if len(merged) < n:  # fall back to equal halves
        w = alpha.shape[1]
        merged = [[i * w // n, (i + 1) * w // n] for i in range(n)]
    return merged


def crop_alpha(img):
    bbox = img.split()[3].point(lambda v: 255 if v > 40 else 0).getbbox()
    return img.crop(bbox) if bbox else img


def main():
    src, out_dir, cid = sys.argv[1], sys.argv[2], sys.argv[3]
    poses = (sys.argv[4] if len(sys.argv) > 4 else "idle,talk").split(",")
    height = int(sys.argv[5]) if len(sys.argv) > 5 else 600
    img = Image.open(src)
    keyed, alpha = key(img)
    bands = split_bands(alpha, len(poses))
    for (x0, x1), pose in zip(bands, poses):
        part = crop_alpha(keyed.crop((max(0, x0 - 6), 0, min(keyed.width, x1 + 6), keyed.height)))
        part = part.filter(ImageFilter.SMOOTH)
        scale = height / part.height
        part = part.resize((max(1, round(part.width * scale)), height), Image.LANCZOS)
        p = f"{out_dir}/{cid}_{pose}.png"
        part.save(p, optimize=True)
        print(p, part.size)


if __name__ == "__main__":
    main()
