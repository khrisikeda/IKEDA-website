import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz
import re

pdf_path = r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf'
doc = fitz.open(pdf_path)

print(f"Total pages: {len(doc)}")

all_rows = []
category_headings = []

for page_idx in range(len(doc)):
    page = doc[page_idx]
    page_num = page_idx + 1
    tables = page.find_tables()
    
    # Check for category title text outside table
    text_instances = page.get_text("blocks")
    for b in text_instances:
        # b: (x0, y0, x1, y1, "text", block_no, block_type)
        txt = b[4].strip()
        if txt in ["General Medical Devices", "Surgical & Operating", "Emergency & ICU Equipment",
                   "Cardiothoracic & Pulmonary", "Neurology", "Gynecology & Obstetrics",
                   "Pediatric & Neonatal", "Urology", "Orthopedics", "Physiotherapy",
                   "Ophthalmology", "ENT", "Dentistry", "Sterilizing & Reprocessing", "Laboratory"]:
            category_headings.append((page_num, txt, b[1]))
    
    if not tables or not tables.tables:
        print(f"Page {page_num}: No table found!")
        continue
        
    for table_idx, t in enumerate(tables.tables):
        extracted = t.extract()
        for r_idx, row in enumerate(t.rows):
            cells = extracted[r_idx]
            # Column 0 is Name, Column 5 (or last) is Notice/Specification
            name = cells[0].strip() if cells[0] else ""
            spec = cells[-1].strip() if cells and len(cells) > 1 and cells[-1] else ""
            
            # Check if this row is a header row
            if name.lower() in ["items", "item", "product", "products", "name"] or "unit price" in "".join(str(c) for c in cells).lower():
                continue
            
            # Find images belonging to this row
            row_y0, row_y1 = row.bbox[1], row.bbox[3]
            row_images = []
            for img_info in page.get_images(full=True):
                xref = img_info[0]
                rects = page.get_image_rects(xref)
                for r in rects:
                    # Ignore header logo at top of page (y < 60)
                    if r.y1 <= 60:
                        continue
                    # Check if image overlaps or center falls in row y-range
                    img_cy = (r.y0 + r.y1) / 2
                    if row_y0 <= img_cy <= row_y1 or (r.y0 >= row_y0 - 5 and r.y1 <= row_y1 + 5):
                        row_images.append((xref, r))
            
            all_rows.append({
                "page": page_num,
                "table_idx": table_idx,
                "row_idx": r_idx,
                "name": name,
                "spec": spec,
                "cells": [c.strip() if c else "" for c in cells],
                "images": row_images,
                "row_bbox": row.bbox
            })

print(f"Total extracted rows across all pages: {len(all_rows)}")
print(f"Category headings found ({len(category_headings)}):", category_headings)

# Check rows with empty name or empty spec or empty images
empty_name = [r for r in all_rows if not r["name"]]
empty_spec = [r for r in all_rows if not r["spec"]]
empty_img = [r for r in all_rows if not r["images"]]

print(f"Rows with empty name: {len(empty_name)}")
print(f"Rows with empty spec: {len(empty_spec)}")
print(f"Rows with empty images: {len(empty_img)}")

if empty_name:
    print("\nSample rows with empty name:")
    for r in empty_name[:10]:
        print(f"  Page {r['page']}, row {r['row_idx']}: cells={r['cells'][:3]} spec_snippet={r['spec'][:40]}")
