"""Split a green-screen item grid sheet into item icons.

usage: python grid.py <sheet.png> <out_dir> <cols> <rows> id1,id2,... [size=128]

Keys green to alpha, splits the sheet into cols x rows equal cells (row-major),
crops each cell to its alpha bounding box, fits it into a size x size square and
saves <out_dir>/<id>.png.
"""
import sys
from PIL import Image
sys.path.insert(0, __file__.rsplit("\\", 1)[0].rsplit("/", 1)[0])
from keyout import key, crop_alpha  # noqa: E402


def main():
    src, out, cols, rows, ids = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5].split(",")
    size = int(sys.argv[6]) if len(sys.argv) > 6 else 128
    keyed, _ = key(Image.open(src))
    cw, ch = keyed.width / cols, keyed.height / rows
    for i, cid in enumerate(ids):
        c, r = i % cols, i // cols
        cell = keyed.crop((int(c * cw) + 18, int(r * ch) + 18, int((c + 1) * cw) - 18, int((r + 1) * ch) - 18))
        cell = crop_alpha(cell)
        s = (size - 8) / max(cell.width, cell.height)
        cell = cell.resize((max(1, round(cell.width * s)), max(1, round(cell.height * s))), Image.LANCZOS)
        icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        icon.paste(cell, ((size - cell.width) // 2, (size - cell.height) // 2), cell)
        icon.save(f"{out}/{cid}.png", optimize=True)
        print(cid, cell.size)


if __name__ == "__main__":
    main()
