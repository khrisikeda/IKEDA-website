import os
from PIL import Image, ImageEnhance, ImageFilter

test_files = [
    "mayo-trolley.png",
    "dirty-clean-trolley.png",
    "curing-lights-q1.png",
    "auto-kerato-refractometer-cot-ark-7600.jpeg",
    "suction-unit-h001-20l-min.jpeg"
]

img_dir = r"public/images/products"

for fname in test_files:
    fpath = os.path.join(img_dir, fname)
    if not os.path.exists(fpath):
        continue
    with Image.open(fpath) as im:
        w, h = im.size
        print(f"Original {fname}: {w}x{h}, mode={im.mode}")
        
        # Calculate target scale (at least 800px on the longer side, up to 1200px)
        scale = max(2.0, min(4.0, 900.0 / max(w, h)))
        new_w = int(round(w * scale))
        new_h = int(round(h * scale))
        
        # Resample with Lanczos
        upscaled = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # Gentle unsharp mask for crisp device contours
        sharpened = upscaled.filter(ImageFilter.UnsharpMask(radius=1.2, percent=140, threshold=2))
        
        # Sharpness enhancer
        enhanced = ImageEnhance.Sharpness(sharpened).enhance(1.1)
        
        out_path = os.path.join("scratch", "enhanced_" + fname)
        if im.format == "PNG" or fname.endswith(".png"):
            enhanced.save(out_path, "PNG", optimize=True)
        else:
            enhanced.save(out_path, "JPEG", quality=95, optimize=True)
            
        print(f"  Enhanced -> {new_w}x{new_h} saved to {out_path}")
