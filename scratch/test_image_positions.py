import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz

pdf_path = r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf'
doc = fitz.open(pdf_path)

for page_num in range(3):
    page = doc[page_num]
    print(f"\n=== Page {page_num + 1} ===")
    
    # Get all images with their bounding boxes on page
    image_list = page.get_images(full=True)
    print(f"Total images on page: {len(image_list)}")
    for img_info in image_list:
        xref = img_info[0]
        # Find where this image is placed on the page
        rects = page.get_image_rects(xref)
        base_img = doc.extract_image(xref)
        print(f"  xref {xref}: rects={rects}, format={base_img['ext']}, dims=({base_img['width']}, {base_img['height']})")

    # Table rows
    tables = page.find_tables()
    if tables and tables.tables:
        t = tables.tables[0]
        for r_idx, row in enumerate(t.rows):
            print(f"  Row {r_idx} bbox: {row.bbox}")
            # Col 0 (Name) and Col 5 (Notice)
            cell_0 = t.extract()[r_idx][0]
            name = cell_0.replace('\n', ' ') if cell_0 else ''
            print(f"    Name: {name}")
