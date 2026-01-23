#!/usr/bin/env python3
# Puprose of this file is to combine map chunks into images per floor for faster loading

import hashlib
import re
import shutil
import sys
import zipfile
from collections import defaultdict
from pathlib import Path
from urllib.request import urlretrieve

from PIL import Image

# ======================================================
# CONFIG
# ======================================================
ARCHIVE_URL = "https://tibiamaps.github.io/tibia-map-data/minimap-without-markers.zip"
MINIMAP_DIR = Path("minimap")
ZIP_NAME = "minimap.zip"

TILE_RE = re.compile(r"Minimap_Color_(-?\d+)_(-?\d+)_(\d+)\.png")

# ======================================================
# HELPERS
# ======================================================
def log(msg):
    print(f"[INFO] {msg}")

def warn(msg):
    print(f"[WARN] {msg}")

def ask(prompt, default=True):
    suffix = " [Y/n]: " if default else " [y/N]: "
    ans = input(prompt + suffix).strip().lower()
    return default if ans == "" else ans.startswith("y")

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()

def count_unique_colors(img):
    """
    Counts unique RGB colors.
    Uses getcolors() safely with fallback.
    """
    # maxcolors=None forces full count
    colors = img.getcolors(maxcolors=256)
    if colors is None:
        # Pillow couldn't count (very unlikely for minimaps)
        return len(set(img.getdata()))
    return len(colors)

# ======================================================
# STEP 1–3: DOWNLOAD & EXTRACT
# ======================================================
if ask("Download minimap archive?", True):
    log("Downloading archive...")
    urlretrieve(ARCHIVE_URL, ZIP_NAME)

    log("Extracting archive...")
    with zipfile.ZipFile(ZIP_NAME) as zf:
        zf.extractall(".")
    Path(ZIP_NAME).unlink()
else:
    log("Using existing data")

# ======================================================
# STEP 4: CHECK MINIMAP FOLDER
# ======================================================
if not MINIMAP_DIR.exists():
    warn("minimap folder not found — aborting")
    sys.exit(1)

# ======================================================
# STEP 5–6: COLLECT TILES
# ======================================================
tiles_by_n = defaultdict(list)

for p in MINIMAP_DIR.iterdir():
    m = TILE_RE.fullmatch(p.name)
    if not m:
        continue
    x, y, n = map(int, m.groups())
    tiles_by_n[n].append((p, x, y))

if not tiles_by_n:
    warn("No minimap tiles detected")
    sys.exit(1)

total_tiles = sum(len(v) for v in tiles_by_n.values())
log(f"Found {total_tiles} tiles across {len(tiles_by_n)} layers (n values)")

# ======================================================
# STEP 7: VERIFY TILE SIZE CONSISTENCY
# ======================================================
sizes = set()
for tiles in tiles_by_n.values():
    for p, _, _ in tiles:
        with Image.open(p) as img:
            sizes.add(img.size)

if len(sizes) != 1:
    warn(f"Inconsistent tile sizes found: {sizes}")
    sys.exit(1)

tile_w, tile_h = sizes.pop()
log(f"All tiles have size {tile_w}x{tile_h}")

# ======================================================
# GLOBAL GRID (same for all n)
# ======================================================
all_x = sorted({x for tiles in tiles_by_n.values() for _, x, _ in tiles})
all_y = sorted({y for tiles in tiles_by_n.values() for _, _, y in tiles})

x_index = {x: i for i, x in enumerate(all_x)}
y_index = {y: i for i, y in enumerate(all_y)}

final_width = len(all_x) * tile_w
final_height = len(all_y) * tile_h

log(
    f"Global grid: {len(all_x)} tiles in X × {len(all_y)} tiles in Y "
    f"→ {final_width}x{final_height}"
)

# ======================================================
# STEP 8–9: COMBINE PER n (RECTANGULAR, BLACK-FILL)
# ======================================================
generated = []

for n, tiles in sorted(tiles_by_n.items()):
    log(f"Combining n={n} ({len(tiles)} tiles)")

    canvas = Image.new("RGB", (final_width, final_height), (0, 0, 0, 255))

    for p, x, y in tiles:
        with Image.open(p) as img:
            px = x_index[x] * tile_w
            py = y_index[y] * tile_h
            canvas.paste(img, (px, py))

    # --- detect actual color usage ---
    color_count = count_unique_colors(canvas)

    if color_count <= 16:
        log(f"n={n}: using {color_count} colors → saving as 16-color indexed PNG")
        target_colors = 16
    else:
        warn(
            f"n={n}: uses {color_count} colors "
            f"(>16) → saving as 256-color indexed PNG"
        )
        target_colors = 256
    
    out_path = MINIMAP_DIR / f"f{n}.png"
    quantized_img = canvas.convert('P', palette=Image.ADAPTIVE, colors=target_colors)
    quantized_img.save(out_path, optimize=True)

    generated.append(out_path)


log(f"Generated {len(generated)} combined images")

# ======================================================
# STEP 10–11: HASH + SIZE COMPARISON
# ======================================================
diff = []

for src in generated:
    dst = Path(src.name)

    src_size = src.stat().st_size
    dst_size = dst.stat().st_size if dst.exists() else 0

    if (not dst.exists()) or sha256(src) != sha256(dst):
        diff.append((src, dst, src_size, dst_size))

if diff:
    log("Differences detected:")
    for src, dst, src_size, dst_size in diff:
        print(f" - {dst.name}")
        print(f"   OLD: {dst_size} bytes")
        print(f"   NEW: {src_size} bytes")
else:
    log("No differences found")

# ======================================================
# STEP 12: REPLACE FILES
# ======================================================
if diff and ask("Replace existing files with new ones?", True):
    for src, dst, src_size, dst_size in diff:
        shutil.copy2(src, dst)
        log(f"Replaced {dst.name}")

# ======================================================
# STEP 13: CLEANUP
# ======================================================
if ask("Delete minimap working folder?", True):
    shutil.rmtree(MINIMAP_DIR)
    log("minimap folder deleted")

log("Done.")
