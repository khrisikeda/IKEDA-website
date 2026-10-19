import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz
import os
import re
import json

doc = fitz.open(r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf')

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

    # Get images in photo column
    page_images = []
    for img_info in page.get_images(full=True):
        xref = img_info[0]
        rects = page.get_image_rects(xref)
        for r in rects:
            if r.y1 <= 65:  # skip header logo
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
        
        # Header row check
        if raw_name.lower() in ["items", "item"] and ("notice" in raw_notice.lower() or "photos" in page.get_text("text", clip=fitz.Rect(COL_PHOTO[0], y0, COL_PHOTO[1], y1)).lower()):
            continue

        # Find images in this row
        row_imgs = []
        for xref, r in page_images:
            cy = (r.y0 + r.y1) / 2
            if y0 <= cy <= y1 or (r.y0 >= y0 - 8 and r.y1 <= y1 + 8) or (r.y0 < y1 and r.y1 > y0):
                row_imgs.append((xref, r))

        sec = get_section_for(page_num, (y0 + y1) / 2)

        # Continuation row of notice
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
                # Row with image but no name (Page 8 row 3)
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

print(f"Extracted {len(products)} products.")
sec_counts = {}
for p in products:
    sec_counts[p["section"]] = sec_counts.get(p["section"], 0) + 1

for sec, cnt in sec_counts.items():
    print(f"  {sec}: {cnt} products")
