import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz
import os
import json

pdf_path = r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf'
doc = fitz.open(pdf_path)

products = []
current_section = "General Medical Devices"

# Known section titles that appear in the document
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

def clean_text(s):
    if not s:
        return ""
    # Strip leading/trailing whitespace
    return s.strip()

for page_idx in range(len(doc)):
    page = doc[page_idx]
    page_num = page_idx + 1
    
    # Check for section headers on this page
    blocks = page.get_text("blocks")
    for b in blocks:
        btxt = " ".join(b[4].split()).strip()
        for sec in SECTIONS:
            if btxt.lower() == sec.lower() or sec.lower() in btxt.lower():
                # Avoid matching table cell content as main section header
                # Main section headers have large font or are outside tables
                if b[1] < 120 or b[1] > 450: # top or bottom of page
                    current_section = sec

    tables = page.find_tables()
    if not tables or not tables.tables:
        continue

    # Get embedded images on this page with rects
    page_images = []
    for img_info in page.get_images(full=True):
        xref = img_info[0]
        rects = page.get_image_rects(xref)
        for r in rects:
            if r.y1 <= 65:  # skip header logo
                continue
            page_images.append((xref, r))

    for table_idx, t in enumerate(tables.tables):
        extracted = t.extract()
        for r_idx, row in enumerate(t.rows):
            cells = extracted[r_idx]
            if not cells:
                continue

            # Header row check
            first_cell = clean_text(cells[0])
            all_cell_text = " ".join(clean_text(c) for c in cells).lower()
            if first_cell.lower() in ["items", "item", "product", "products", "name"] and ("unit price" in all_cell_text or "notice" in all_cell_text or "photos" in all_cell_text):
                continue
            if "unit price (rwf)" in all_cell_text and "notice" in all_cell_text:
                continue

            row_y0, row_y1 = row.bbox[1], row.bbox[3]
            
            # Find images in this row
            matched_images = []
            for xref, r in page_images:
                img_cy = (r.y0 + r.y1) / 2
                # Check vertical overlap
                if (row_y0 <= img_cy <= row_y1) or (r.y0 >= row_y0 - 8 and r.y1 <= row_y1 + 8) or (r.y0 < row_y1 and r.y1 > row_y0):
                    # Also check that horizontal position is roughly in the photo column (x between 80 and 300)
                    if 70 <= (r.x0 + r.x1)/2 <= 320:
                        matched_images.append((xref, r))

            name_cell = clean_text(cells[0])
            spec_cell = clean_text(cells[-1]) if len(cells) > 1 else ""

            # Check if this is a continuation of the previous product
            # Condition: name_cell is empty, but spec_cell exists and products list is not empty
            if not name_cell and spec_cell and products:
                # Append to previous product specification
                prev_prod = products[-1]
                prev_prod["specification"] += "\n" + spec_cell
                if matched_images and not prev_prod["images"]:
                    prev_prod["images"].extend(matched_images)
                continue
            
            # If name is empty, but there are images or other cells:
            if not name_cell:
                if matched_images:
                    # Let's record this as an item with missing name or unnamed item
                    products.append({
                        "name": f"[Unnamed Item on Page {page_num}]",
                        "raw_name": "",
                        "specification": spec_cell,
                        "section": current_section,
                        "page": page_num,
                        "row_idx": r_idx,
                        "images": matched_images,
                        "cells": [clean_text(c) for c in cells]
                    })
                continue

            # New product
            products.append({
                "name": name_cell,
                "raw_name": cells[0], # exact with newlines
                "specification": spec_cell,
                "section": current_section,
                "page": page_num,
                "row_idx": r_idx,
                "images": matched_images,
                "cells": [clean_text(c) for c in cells]
            })

print(f"Total products parsed: {len(products)}")
with open(r'c:\Users\user\Downloads\ikeda-endoscopy-africa-website\scratch\parsed_products.json', 'w', encoding='utf-8') as f:
    # Prepare serializable
    serializable = []
    for p in products:
        p_copy = dict(p)
        p_copy["images"] = [{"xref": img[0], "rect": [img[1].x0, img[1].y0, img[1].x1, img[1].y1]} for img in p["images"]]
        serializable.append(p_copy)
    json.dump(serializable, f, indent=2, ensure_ascii=False)

print("Saved scratch/parsed_products.json")
