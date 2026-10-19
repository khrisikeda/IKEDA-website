import os
import sys
sys.stdout.reconfigure(encoding='utf-8')
from PIL import Image, ImageOps

test_files = [
    "curing-lights-q1.png",                     # tall & narrow
    "dental-chair-siger-v6000.jpeg",            # wide
    "baby-incubator-bb100.jpeg",                # roughly square
    "auto-kerato-refractometer-cot-ark-7600.jpeg"
]

CANVAS_SIZE = (1000, 1000)
PADDING = 40  # 40px padding, so product fills 920px (big!)

for fname in test_files:
    fpath = os.path.join("public", "images", "products", fname)
    if not os.path.exists(fpath):
        continue
    with Image.open(fpath) as im:
        w, h = im.size
        # Target bounding box inside canvas
        target_w = CANVAS_SIZE[0] - 2 * PADDING
        target_h = CANVAS_SIZE[1] - 2 * PADDING
        
        # Scale factor so it fits nicely and BIG
        scale = min(target_w / w, target_h / h)
        new_w = int(round(w * scale))
        new_h = int(round(h * scale))
        
        resized = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # Position centered
        paste_x = (CANVAS_SIZE[0] - new_w) // 2
        paste_y = (CANVAS_SIZE[1] - new_h) // 2
        
        if im.mode == "RGBA":
            # Transparent canvas
            canvas = Image.new("RGBA", CANVAS_SIZE, (255, 255, 255, 0))
            canvas.paste(resized, (paste_x, paste_y), resized)
            out_path = os.path.join("scratch", "uniform_" + fname)
            canvas.save(out_path, "PNG", optimize=True)
        else:
            # Clean white canvas
            canvas = Image.new("RGB", CANVAS_SIZE, (255, 255, 255))
            canvas.paste(resized, (paste_x, paste_y))
            out_path = os.path.join("scratch", "uniform_" + fname)
            canvas.save(out_path, "JPEG", quality=98, optimize=True)
            
        print(f"Standardized {fname} -> {CANVAS_SIZE[0]}x{CANVAS_SIZE[1]} (product was {w}x{h}, now {new_w}x{new_h})")
