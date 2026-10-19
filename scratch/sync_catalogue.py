import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz
import os
import re
import json
import difflib

pdf_path = r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf'
doc = fitz.open(pdf_path)

output_img_dir = r'c:\Users\user\Downloads\ikeda-endoscopy-africa-website\public\images\products'
os.makedirs(output_img_dir, exist_ok=True)

COL_NAME = (40.0, 115.0)
COL_PHOTO = (110.0, 280.0)
COL_NOTICE = (415.0, 585.0)

SECTIONS = [
    "General Medical Devices",
    "Surgical & Operating",
    "Emergency & ICU Equipment",
    "Cardiothoracic & Pulmonary",
    "Neurology",
    "Gynecology & Obstetrics",
    "Pediatric & Neonatal",
    "Urology",
    "Orthopedics",
    "Physiotherapy",
    "Ophthalmology",
    "ENT",
    "Dentistry",
    "Sterilizing & Reprocessing",
    "Laboratory"
]

def make_slug(name):
    s = name.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s[:60] if s else 'product'

current_section = "General Medical Devices"
extracted_products = []
current_prod = None

for pno in range(len(doc)):
    page = doc[pno]
    page_num = pno + 1
    
    # 1. Check for section headings
    blocks = page.get_text("blocks")
    for b in blocks:
        btxt = " ".join(b[4].split()).strip()
        for sec in SECTIONS:
            if btxt.lower() == sec.lower() or sec.lower() in btxt.lower():
                if b[1] < 120 or b[1] > 450:
                    current_section = sec

    # 2. Get horizontal grid lines on page
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

    # 3. Get images in photo column
    page_images = []
    for img_info in page.get_images(full=True):
        xref = img_info[0]
        rects = page.get_image_rects(xref)
        for r in rects:
            if r.y1 <= 65:  # skip header logo
                continue
            if COL_PHOTO[0] <= (r.x0 + r.x1) / 2 <= COL_PHOTO[1]:
                page_images.append((xref, r))

    # 4. Process each row
    for i in range(len(table_h_lines) - 1):
        y0 = table_h_lines[i]
        y1 = table_h_lines[i + 1]
        
        rect_name = fitz.Rect(COL_NAME[0], y0, COL_NAME[1], y1)
        rect_notice = fitz.Rect(COL_NOTICE[0], y0, COL_NOTICE[1], y1)
        
        raw_name = page.get_text("text", clip=rect_name).strip()
        raw_notice = page.get_text("text", clip=rect_notice).strip()
        
        # Header row check
        if raw_name.lower() in ["items", "item"] and ("notice" in raw_notice.lower() or "photos" in page.get_text("text", clip=fitz.Rect(COL_PHOTO[0], y0, COL_PHOTO[1], y1)).lower()):
            continue

        # Find images in this row
        row_imgs = []
        for xref, r in page_images:
            cy = (r.y0 + r.y1) / 2
            if y0 <= cy <= y1 or (r.y0 >= y0 - 8 and r.y1 <= y1 + 8) or (r.y0 < y1 and r.y1 > y0):
                row_imgs.append((xref, r))

        # Check for continuation row
        if not raw_name and raw_notice and current_prod:
            current_prod["specification"] += "\n" + raw_notice
            if row_imgs and not current_prod["image_xrefs"]:
                current_prod["image_xrefs"].extend(row_imgs)
            continue
            
        # Unnamed row with image belonging to previous product
        if not raw_name and not raw_notice:
            if row_imgs and current_prod and page_num in [61, 62, 68]:
                # Extra photos for current product
                current_prod["image_xrefs"].extend(row_imgs)
                continue
            elif row_imgs and not raw_name:
                # Row with image but no name (e.g. Page 8 row 3 ward privacy screen)
                current_prod = {
                    "page": page_num,
                    "row": i,
                    "name": f"[Unnamed Ward Privacy Screen on Page {page_num}]",
                    "exact_name": "",
                    "specification": "",
                    "image_xrefs": row_imgs,
                    "section": current_section
                }
                extracted_products.append(current_prod)
                continue
            continue

        # New product row
        clean_name_val = " ".join(raw_name.split())
        current_prod = {
            "page": page_num,
            "row": i,
            "name": clean_name_val,
            "exact_name": raw_name,
            "specification": raw_notice,
            "image_xrefs": row_imgs,
            "section": current_section
        }
        extracted_products.append(current_prod)

print(f"Extracted {len(extracted_products)} products from PDF.")

# Export images
saved_slugs = {}
for p in extracted_products:
    p["image_path"] = None
    if p["image_xrefs"]:
        # Pick the primary image (usually the largest or first)
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

# Now compare with data/products.json
with open('data/products.json', 'r', encoding='utf-8') as f:
    db_data = json.load(f)

# Extract all items in DB
db_items = []
for cat_idx, cat in enumerate(db_data):
    for item_idx, item in enumerate(cat.get("equipmentHighlights", [])):
        if isinstance(item, dict):
            name = item.get("name", "")
            img = item.get("image")
            features = item.get("features", [])
        else:
            name = str(item)
            img = None
            features = []
        db_items.append({
            "cat_idx": cat_idx,
            "cat_name": cat.get("name"),
            "cat_slug": cat.get("slug"),
            "dept_group": cat.get("departmentGroup"),
            "item_idx": item_idx,
            "name": name,
            "image": img,
            "features": features,
            "raw_item": item
        })

print(f"Total existing database items: {len(db_items)}")

# Normalization helper
def norm(s):
    if not s:
        return ""
    return re.sub(r'[^a-z0-9]+', '', s.lower())

# Match PDF to DB
matched_pairs = [] # (pdf_prod, db_item, similarity)
unmatched_pdf = []
matched_db_indices = set()

for pdf_p in extracted_products:
    pdf_norm = norm(pdf_p["name"])
    best_match = None
    best_sim = 0.0
    best_idx = None
    
    for idx, db_item in enumerate(db_items):
        db_norm = norm(db_item["name"])
        if pdf_norm == db_norm and pdf_norm != "":
            best_match = db_item
            best_sim = 1.0
            best_idx = idx
            break
        # Similarity ratio
        sim = difflib.SequenceMatcher(None, pdf_norm, db_norm).ratio()
        if sim > best_sim:
            best_sim = sim
            best_match = db_item
            best_idx = idx
            
    if best_sim >= 0.999: # Exact match
        matched_pairs.append((pdf_p, best_match, 1.0, "exact"))
        matched_db_indices.add(best_idx)
    elif best_sim >= 0.72: # Near match for review
        matched_pairs.append((pdf_p, best_match, best_sim, "near"))
        matched_db_indices.add(best_idx)
    else:
        unmatched_pdf.append(pdf_p)

# Items in DB NOT in PDF
unmatched_db = [item for idx, item in enumerate(db_items) if idx not in matched_db_indices]

# Save report data
report = {
    "total_pdf_products": len(extracted_products),
    "total_db_items": len(db_items),
    "exact_matches": [(p[0]["name"], p[1]["name"], p[1]["cat_name"]) for p in matched_pairs if p[3] == "exact"],
    "near_matches": [(p[0]["name"], p[1]["name"], f"{p[2]:.2f}", p[1]["cat_name"]) for p in matched_pairs if p[3] == "near"],
    "pdf_to_add": [(p["name"], p["section"], p["page"], p["image_path"], bool(p["specification"])) for p in unmatched_pdf],
    "db_to_remove": [(d["name"], d["cat_name"], d["dept_group"]) for d in unmatched_db],
    "missing_image": [p["name"] for p in extracted_products if not p["image_path"]],
    "missing_spec": [p["name"] for p in extracted_products if not p["specification"]]
}

with open(r'c:\Users\user\Downloads\ikeda-endoscopy-africa-website\scratch\sync_report.json', 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2, ensure_ascii=False)

print(f"\n--- Sync Analysis ---")
print(f"Exact Matches: {len(report['exact_matches'])}")
print(f"Near Matches (needing review): {len(report['near_matches'])}")
print(f"PDF Products to ADD: {len(report['pdf_to_add'])}")
print(f"DB Items to REMOVE (awaiting confirmation): {len(report['db_to_remove'])}")
print(f"PDF Items with Missing Image: {len(report['missing_image'])}")
print(f"PDF Items with Missing Notice: {len(report['missing_spec'])}")

print("\nSample Near Matches:")
for nm in report['near_matches'][:10]:
    print(f"  PDF: '{nm[0]}' <==> DB: '{nm[1]}' (score: {nm[2]}, cat: {nm[3]})")

print("\nSample DB to REMOVE (first 10):")
for r in report['db_to_remove'][:10]:
    print(f"  '{r[0]}' in '{r[1]}' ({r[2]})")
