import os
import sys
sys.stdout.reconfigure(encoding='utf-8')
from PIL import Image, ImageEnhance, ImageFilter

img_dir = r"public/images/products"
files = [f for f in os.listdir(img_dir) if os.path.isfile(os.path.join(img_dir, f))]

print(f"Enhancing {len(files)} product images...")
enhanced_count = 0
skipped_count = 0

for idx, fname in enumerate(files):
    fpath = os.path.join(img_dir, fname)
    try:
        with Image.open(fpath) as im:
            w, h = im.size
            
            # Determine target resolution
            # If smaller than 800px on the longest edge, upscale to 800-1000px
            max_dim = max(w, h)
            if max_dim >= 1000:
                scale = 1.0
            else:
                scale = max(2.0, min(4.5, 950.0 / max_dim))
                
            new_w = int(round(w * scale))
            new_h = int(round(h * scale))
            
            orig_format = im.format or ("PNG" if fname.lower().endswith(".png") else "JPEG")
            
            if im.mode == "RGBA":
                r, g, b, a = im.split()
                rgb = Image.merge("RGB", (r, g, b))
                
                rgb_resized = rgb.resize((new_w, new_h), Image.Resampling.LANCZOS)
                a_resized = a.resize((new_w, new_h), Image.Resampling.LANCZOS)
                
                # Sharpen RGB
                rgb_sharp = rgb_resized.filter(ImageFilter.UnsharpMask(radius=1.2, percent=135, threshold=2))
                rgb_sharp = ImageEnhance.Sharpness(rgb_sharp).enhance(1.12)
                rgb_sharp = ImageEnhance.Contrast(rgb_sharp).enhance(1.03)
                
                r2, g2, b2 = rgb_sharp.split()
                res = Image.merge("RGBA", (r2, g2, b2, a_resized))
                res.save(fpath, "PNG", optimize=True)
            elif im.mode == "P":
                im_rgba = im.convert("RGBA")
                r, g, b, a = im_rgba.split()
                rgb = Image.merge("RGB", (r, g, b))
                
                rgb_resized = rgb.resize((new_w, new_h), Image.Resampling.LANCZOS)
                a_resized = a.resize((new_w, new_h), Image.Resampling.LANCZOS)
                
                rgb_sharp = rgb_resized.filter(ImageFilter.UnsharpMask(radius=1.2, percent=135, threshold=2))
                rgb_sharp = ImageEnhance.Sharpness(rgb_sharp).enhance(1.12)
                rgb_sharp = ImageEnhance.Contrast(rgb_sharp).enhance(1.03)
                
                r2, g2, b2 = rgb_sharp.split()
                res = Image.merge("RGBA", (r2, g2, b2, a_resized))
                res.save(fpath, "PNG", optimize=True)
            else:
                im_rgb = im.convert("RGB")
                resized = im_rgb.resize((new_w, new_h), Image.Resampling.LANCZOS)
                sharp = resized.filter(ImageFilter.UnsharpMask(radius=1.2, percent=135, threshold=2))
                sharp = ImageEnhance.Sharpness(sharp).enhance(1.12)
                sharp = ImageEnhance.Contrast(sharp).enhance(1.03)
                
                if fname.lower().endswith(".png"):
                    sharp.save(fpath, "PNG", optimize=True)
                else:
                    sharp.save(fpath, "JPEG", quality=95, optimize=True)
                    
            enhanced_count += 1
            if (idx + 1) % 25 == 0 or idx == len(files) - 1:
                print(f"Processed {idx + 1}/{len(files)}: {fname} -> {new_w}x{new_h}")
                
    except Exception as e:
        print(f"Error processing {fname}: {e}")

print(f"\nDone! Enhanced {enhanced_count} images.")
