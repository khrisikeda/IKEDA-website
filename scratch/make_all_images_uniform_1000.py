import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz
import os
import re
import json
from PIL import Image, ImageChops, ImageEnhance, ImageFilter

doc = fitz.open(r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf')
output_img_dir = r'c:\Users\user\Downloads\ikeda-endoscopy-africa-website\public\images\products'

COL_NAME = (40.0, 115.0)
COL_PHOTO = (110.0, 280.0)
COL_NOTICE = (415.0, 585.0)

def make_slug(name):
    s = name.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s[:60] if s else 'product'

# Find all rows and their photo rects across all pages
products = []
current_prod = None

for pno in range(len(doc)):
    page = doc[pno]
    page_num = pno + 1
    
    drawings = page.get_drawings()
    h_lines = []
    for d in drawings:
        for item in d["items"]:
            if item[0] == "l":
                p1, p2 = item[1], item[2]
                if abs(p1.y - p2.y) < 1 and abs(p1.x - p2.x) > 100:
                    h_lines.append(round(p1.y, 1))
            elif item[0] == "re":
                r = item[1]
                if r.height < 2 and r.width > 100:
                    h_lines.append(round(r.y0, 1))
    
    table_h_lines = sorted(list(set([y for y in h_lines if y > 65.0])))
    if len(table_h_lines) < 2:
        continue

    page_images = []
    for img_info in page.get_images(full=True):
        xref = img_info[0]
        rects = page.get_image_rects(xref)
        for r in rects:
            if r.y1 <= 65:
                continue
            if COL_PHOTO[0] <= (r.x0 + r.x1) / 2 <= COL_PHOTO[1]:
                page_images.append((xref, r))

    for i in range(len(table_h_lines) - 1):
        y0 = table_h_lines[i]
        y1 = table_h_lines[i + 1]
        
        rect_name = fitz.Rect(COL_NAME[0], y0, COL_NAME[1], y1)
        rect_notice = fitz.Rect(COL_NOTICE[0], y0, COL_NOTICE[1], y1)
        
        raw_name = page.get_text("text", clip=rect_name).strip()
        raw_notice = page.get_text("text", clip=rect_notice).strip()
        
        if raw_name.lower() in ["items", "item"] and ("notice" in raw_notice.lower() or "photos" in page.get_text("text", clip=fitz.Rect(COL_PHOTO[0], y0, COL_PHOTO[1], y1)).lower()):
            continue

        row_imgs = []
        for xref, r in page_images:
            cy = (r.y0 + r.y1) / 2
            if y0 <= cy <= y1 or (r.y0 >= y0 - 8 and r.y1 <= y1 + 8) or (r.y0 < y1 and r.y1 > y0):
                row_imgs.append((xref, r))

        if not raw_name and raw_notice and current_prod:
            if row_imgs and not current_prod["image_xrefs"]:
                current_prod["image_xrefs"].extend(row_imgs)
            continue
            
        if not raw_name and not raw_notice:
            if row_imgs and current_prod and page_num in [61, 62, 68]:
                current_prod["image_xrefs"].extend(row_imgs)
                continue
            elif row_imgs and not raw_name:
                current_prod = {
                    "page": page_num,
                    "name": "Ward Privacy Screen",
                    "image_xrefs": row_imgs,
                    "cell_rect": fitz.Rect(COL_PHOTO[0], y0, COL_PHOTO[1], y1)
                }
                products.append(current_prod)
                continue
            continue

        clean_name = " ".join(raw_name.split())
        current_prod = {
            "page": page_num,
            "name": clean_name,
            "image_xrefs": row_imgs,
            "cell_rect": fitz.Rect(COL_PHOTO[0], y0, COL_PHOTO[1], y1)
        }
        products.append(current_prod)

print(f"Extracted {len(products)} products.")

# Read data/products.json to get filenames currently assigned to each product name
with open('data/products.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

db_prod_images = {}
for c in db:
    for item in c.get('equipmentHighlights', []):
        if item.get('image'):
            fname = item['image'].split('/')[-1]
            db_prod_images[item['name'].lower()] = fname

CANVAS_SIZE = 1000
TARGET_SIZE = 920

saved_slugs = {}
processed_files = set()

for p in products:
    if not p["image_xrefs"]:
        continue
        
    pname_l = p["name"].lower()
    filename = db_prod_images.get(pname_l)
    
    if not filename:
        # Determine filename slug
        xref = p["image_xrefs"][0][0]
        base_slug = make_slug(p["name"])
        slug = base_slug
        count = 1
        while slug in saved_slugs and saved_slugs[slug] != xref:
            slug = f"{base_slug}-{count}"
            count += 1
        saved_slugs[slug] = xref
        filename = f"{slug}.jpeg"
    
    out_filepath = os.path.join(output_img_dir, filename)
    
    page = doc[p["page"] - 1]
    img_rect = p["image_xrefs"][0][1]
    
    # Inset slightly by 1.5 points to avoid cell line borders
    clip_rect = fitz.Rect(img_rect.x0 + 1.5, img_rect.y0 + 1.5, img_rect.x1 - 1.5, img_rect.y1 - 1.5)
    
    # Render at 4.5x high resolution
    pix = page.get_pixmap(matrix=fitz.Matrix(4.5, 4.5), clip=clip_rect)
    tmp_path = os.path.join("scratch", "temp_render.png")
    pix.save(tmp_path)
    
    try:
        with Image.open(tmp_path).convert("RGB") as im:
            # Auto-crop whitespace
            bg = Image.new("RGB", im.size, (255, 255, 255))
            diff = ImageChops.difference(im, bg)
            # Threshold difference > 12 to filter subtle compression noise
            mask = diff.convert("L").point(lambda val: 255 if val > 12 else 0)
            bbox = mask.getbbox()
            
            if bbox and (bbox[2] - bbox[0] > 15) and (bbox[3] - bbox[1] > 15):
                cropped = im.crop(bbox)
            else:
                cropped = im
                
            cw, ch = cropped.size
            scale = TARGET_SIZE / max(cw, ch)
            new_w = max(1, int(round(cw * scale)))
            new_h = max(1, int(round(ch * scale)))
            
            resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
            sharp = resized.filter(ImageFilter.UnsharpMask(radius=1.2, percent=125, threshold=2))
            enhanced = ImageEnhance.Sharpness(sharp).enhance(1.08)
            
            # Standardized 1000x1000 pure white canvas
            canvas = Image.new("RGB", (CANVAS_SIZE, CANVAS_SIZE), (255, 255, 255))
            paste_x = (CANVAS_SIZE - new_w) // 2
            paste_y = (CANVAS_SIZE - new_h) // 2
            
            canvas.paste(enhanced, (paste_x, paste_y))
            
            # Save file
            if filename.lower().endswith(".png"):
                canvas.save(out_filepath, "PNG", optimize=True)
            else:
                canvas.save(out_filepath, "JPEG", quality=98, optimize=True)
                
            processed_files.add(filename)
            
    except Exception as e:
        print(f"Error processing {p['name']}: {e}")

print(f"\nSuccessfully rendered and standardized {len(processed_files)} images to uniform 1000x1000 resolution!")

# Also standardize any remaining files in public/images/products that weren't caught
all_files = [f for f in os.listdir(output_img_dir) if os.path.isfile(os.path.join(output_img_dir, f))]
remaining = [f for f in all_files if f not in processed_files]
print(f"Checking {len(remaining)} remaining images for 1000x1000 standardization...")

for fname in remaining:
    fpath = os.path.join(output_img_dir, fname)
    try:
        with Image.open(fpath) as im:
            if im.size == (CANVAS_SIZE, CANVAS_SIZE):
                continue
            w, h = im.size
            scale = TARGET_SIZE / max(w, h)
            new_w = max(1, int(round(w * scale)))
            new_h = max(1, int(round(h * scale)))
            
            resized = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
            sharp = resized.filter(ImageFilter.UnsharpMask(radius=1.2, percent=120, threshold=2))
            
            paste_x = (CANVAS_SIZE - new_w) // 2
            paste_y = (CANVAS_SIZE - new_h) // 2
            
            if im.mode == "RGBA":
                canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (255, 255, 255, 0))
                canvas.paste(sharp, (paste_x, paste_y), sharp)
                canvas.save(fpath, "PNG", optimize=True)
            else:
                canvas = Image.new("RGB", (CANVAS_SIZE, CANVAS_SIZE), (255, 255, 255))
                canvas.paste(sharp.convert("RGB"), (paste_x, paste_y))
                canvas.save(fpath, "JPEG", quality=98, optimize=True)
                
            print(f"Standardized remaining: {fname} -> 1000x1000")
    except Exception as e:
        print(f"Error on remaining {fname}: {e}")

print("All product images standardized to 1000x1000!")
