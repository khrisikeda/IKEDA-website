import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz

pdf_path = r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf'
doc = fitz.open(pdf_path)

COL_NAME = (40.0, 115.0)
COL_PHOTO = (110.0, 280.0)
COL_NOTICE = (415.0, 585.0)

all_extracted_products = []
current_prod = None

for pno in range(len(doc)):
    page = doc[pno]
    page_num = pno + 1
    
    # 1. Get horizontal grid lines on page
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
    
    # Filter out header line around y=55.8
    h_lines = sorted(list(set(h_lines)))
    table_h_lines = [y for y in h_lines if y > 65.0]
    
    if len(table_h_lines) < 2:
        # No table on this page (e.g. cover page or blank page)
        print(f"Page {page_num}: No table grid lines found (lines={table_h_lines})")
        continue

    # 2. Extract embedded images on this page
    page_images = []
    for img_info in page.get_images(full=True):
        xref = img_info[0]
        rects = page.get_image_rects(xref)
        for r in rects:
            if r.y1 <= 65:  # header logo
                continue
            # Must be in photo column
            if COL_PHOTO[0] <= (r.x0 + r.x1) / 2 <= COL_PHOTO[1]:
                page_images.append((xref, r))

    # 3. For each row between h_lines[i] and h_lines[i+1]
    for i in range(len(table_h_lines) - 1):
        y0 = table_h_lines[i]
        y1 = table_h_lines[i + 1]
        
        # Extract text in Name col and Notice col
        rect_name = fitz.Rect(COL_NAME[0], y0, COL_NAME[1], y1)
        rect_notice = fitz.Rect(COL_NOTICE[0], y0, COL_NOTICE[1], y1)
        
        raw_name = page.get_text("text", clip=rect_name).strip()
        raw_notice = page.get_text("text", clip=rect_notice).strip()
        
        # Check if header row e.g. "Items" / "Notice"
        if raw_name.lower() in ["items", "item"] and ("notice" in raw_notice.lower() or "photos" in page.get_text("text", clip=fitz.Rect(COL_PHOTO[0], y0, COL_PHOTO[1], y1)).lower()):
            continue
            
        # Find images in this row
        row_imgs = []
        for xref, r in page_images:
            cy = (r.y0 + r.y1) / 2
            if y0 <= cy <= y1 or (r.y0 >= y0 - 5 and r.y1 <= y1 + 5) or (r.y0 < y1 and r.y1 > y0):
                row_imgs.append((xref, r))

        # Check for continuation:
        # If this is the FIRST row on the page (or name is empty), and current_prod exists, and raw_notice exists, but raw_name is empty:
        if not raw_name and raw_notice and current_prod:
            current_prod["specification"] += "\n" + raw_notice
            if row_imgs and not current_prod["images"]:
                current_prod["images"].extend(row_imgs)
            continue
            
        # If both name and notice and images are empty:
        if not raw_name and not raw_notice and not row_imgs:
            continue

        # Create new product entry
        current_prod = {
            "page": page_num,
            "row": i,
            "name": raw_name,
            "specification": raw_notice,
            "images": row_imgs,
            "y_range": (y0, y1)
        }
        all_extracted_products.append(current_prod)

print(f"\nTotal extracted products: {len(all_extracted_products)}")

# Summary statistics
named_count = sum(1 for p in all_extracted_products if p["name"])
with_img_count = sum(1 for p in all_extracted_products if p["images"])
with_spec_count = sum(1 for p in all_extracted_products if p["specification"])

print(f"Named products: {named_count}")
print(f"Products with image: {with_img_count}")
print(f"Products with specification: {with_spec_count}")

unnamed = [p for p in all_extracted_products if not p["name"]]
print(f"Unnamed products count: {len(unnamed)}")
for u in unnamed:
    print(f"  Page {u['page']}, row {u['row']}, y={u['y_range']}: imgs={len(u['images'])} spec={repr(u['specification'][:40])}")
