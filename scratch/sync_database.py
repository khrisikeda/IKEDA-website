import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz
import os
import re
import json

doc = fitz.open(r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf')
output_img_dir = r'c:\Users\user\Downloads\ikeda-endoscopy-africa-website\public\images\products'
os.makedirs(output_img_dir, exist_ok=True)

SECTION_TRANSITIONS = [
    (1, 350.0, "General Medical Devices"),
    (19, 500.0, "Surgical & Operating"),
    (25, 60.0, "Emergency & ICU Equipment"),
    (28, 40.0, "Cardiothoracic & Pulmonary"),
    (29, 580.0, "Neurology"),
    (31, 40.0, "Gynecology & Obstetrics"),
    (32, 580.0, "Pediatric & Neonatal"),
    (35, 70.0, "Urology"),
    (35, 580.0, "Orthopedics"),
    (37, 520.0, "Physiotherapy"),
    (41, 40.0, "Ophthalmology"),
    (55, 70.0, "ENT"),
    (62, 350.0, "Dentistry"),
    (78, 300.0, "Sterilizing & Reprocessing"),
    (80, 630.0, "Laboratory")
]

def get_section_for(page_num, y_pos):
    current = "General Medical Devices"
    for p, y, sec in SECTION_TRANSITIONS:
        if page_num > p or (page_num == p and y_pos >= y):
            current = sec
    return current

def make_slug(name):
    s = name.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s[:60] if s else 'product'

COL_NAME = (40.0, 115.0)
COL_PHOTO = (110.0, 280.0)
COL_NOTICE = (415.0, 585.0)

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

        sec = get_section_for(page_num, (y0 + y1) / 2)

        if not raw_name and raw_notice and current_prod:
            current_prod["specification"] += "\n" + raw_notice
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
                    "row": i,
                    "name": "Ward Privacy Screen",
                    "exact_name": "Ward Privacy Screen",
                    "specification": "",
                    "image_xrefs": row_imgs,
                    "section": sec
                }
                products.append(current_prod)
                continue
            continue

        clean_name = " ".join(raw_name.split())
        current_prod = {
            "page": page_num,
            "row": i,
            "name": clean_name,
            "exact_name": raw_name,
            "specification": raw_notice,
            "image_xrefs": row_imgs,
            "section": sec
        }
        products.append(current_prod)

print(f"Extracted {len(products)} products from PDF.")

# Map images
saved_slugs = {}
for p in products:
    p["image_path"] = None
    if p["image_xrefs"]:
        xref = p["image_xrefs"][0][0]
        base_img = doc.extract_image(xref)
        ext = base_img["ext"]
        img_bytes = base_img["image"]
        
        base_slug = make_slug(p["name"])
        slug = base_slug
        count = 1
        while slug in saved_slugs and saved_slugs[slug] != xref:
            slug = f"{base_slug}-{count}"
            count += 1
        saved_slugs[slug] = xref
        
        filename = f"{slug}.{ext}"
        filepath = os.path.join(output_img_dir, filename)
        if not os.path.exists(filepath):
            with open(filepath, "wb") as f:
                f.write(img_bytes)
        p["image_path"] = f"/images/products/{filename}"

# Refined category mapping logic
def get_categories_for_product(prod):
    sec = prod["section"]
    name_l = prod["name"].lower()
    cats = []
    
    if sec == "General Medical Devices":
        cats.append("general-hospital-materials")
        if "patient monitor" in name_l:
            cats.append("intensive-care")
        elif "ultrasound" in name_l:
            cats.append("radiology")
        elif "wheel chair" in name_l:
            cats.append("physiotherapy")
        elif "suction" in name_l or "oxygen" in name_l:
            cats.append("emergency")
    elif sec == "Surgical & Operating":
        cats.append("operating-theatre")
        if "laparoscopy" in name_l:
            cats.append("laparoscopy")
        elif "c arm" in name_l or "ultrasound" in name_l:
            cats.append("radiology")
        elif "ventilator" in name_l or "monitor" in name_l:
            cats.append("intensive-care")
        elif "orthopedic" in name_l:
            cats.append("orthopedics")
        elif "gynecology" in name_l:
            cats.append("gynecology")
            cats.append("maternity")
    elif sec == "Emergency & ICU Equipment":
        cats.append("intensive-care")
        cats.append("emergency")
        if "pediatric" in name_l or "infant" in name_l:
            cats.append("pediatrics")
            cats.append("neonatology")
        elif "bronchoscop" in name_l:
            cats.append("gastroenterology")
    elif sec == "Cardiothoracic & Pulmonary":
        cats.append("vats")
        cats.append("general-hospital-materials")
    elif sec == "Neurology":
        cats.append("general-hospital-materials")
    elif sec == "Gynecology & Obstetrics":
        cats.append("maternity")
        cats.append("gynecology")
    elif sec == "Pediatric & Neonatal":
        cats.append("neonatology")
        cats.append("pediatrics")
    elif sec == "Urology":
        cats.append("urology")
    elif sec == "Orthopedics":
        cats.append("orthopedics")
        if "surgical table" in name_l:
            cats.append("operating-theatre")
    elif sec == "Physiotherapy":
        cats.append("physiotherapy")
    elif sec == "Ophthalmology":
        cats.append("ophthalmology")
    elif sec == "ENT":
        cats.append("ent")
    elif sec == "Dentistry":
        cats.append("dentistry")
        if "xray" in name_l or "x-ray" in name_l or "sensor" in name_l:
            cats.append("radiology")
        if "autoclave" in name_l:
            cats.append("operating-theatre")
            cats.append("laboratory")
    elif sec == "Sterilizing & Reprocessing":
        cats.append("operating-theatre")
        cats.append("laboratory")
        cats.append("general-hospital-materials")
    elif sec == "Laboratory":
        cats.append("laboratory")
    else:
        cats.append("general-hospital-materials")
        
    return cats

# Load existing database
with open('data/products.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

# Clear existing placeholder equipmentHighlights from all categories
cat_items_map = {c["slug"]: [] for c in db}

# Populate categories with products
for p in products:
    spec = p["specification"]
    lines = [l.strip() for l in spec.split("\n") if l.strip()]
    
    prod_obj = {
        "name": p["name"],
        "image": p["image_path"],
        "specification": spec,
        "features": lines if lines else [],
        "category": p["section"]
    }
    
    assigned_cats = get_categories_for_product(p)
    for cslug in assigned_cats:
        if cslug in cat_items_map:
            # Check for duplicate in category to ensure idempotency
            existing_names = [x["name"].lower() for x in cat_items_map[cslug]]
            if prod_obj["name"].lower() not in existing_names:
                item_copy = dict(prod_obj)
                cat_name = next((c["name"] for c in db if c["slug"] == cslug), p["section"])
                item_copy["category"] = cat_name
                cat_items_map[cslug].append(item_copy)

# Assign to db categories
for c in db:
    c["equipmentHighlights"] = cat_items_map[c["slug"]]

# Save updated products.json
with open('data/products.json', 'w', encoding='utf-8') as f:
    json.dump(db, f, indent=2, ensure_ascii=False)

print("\nSuccessfully updated data/products.json!")
for c in db:
    print(f"  Category '{c['name']}' ({c['slug']}): {len(c['equipmentHighlights'])} items")
