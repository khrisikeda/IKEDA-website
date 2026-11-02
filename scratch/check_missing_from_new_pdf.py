import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz
import json
import re

pdf_path = r'C:\Users\user\.gemini\antigravity\brain\e7dc28d2-7f08-402f-a29e-724c720f4982\.user_uploaded\media_1793624610154_f7709bb1.pdf'
doc = fitz.open(pdf_path)
print('Pages in new PDF:', len(doc))

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
        for item in d['items']:
            if item[0] == 'l':
                p1, p2 = item[1], item[2]
                if abs(p1.y - p2.y) < 1 and abs(p1.x - p2.x) > 100:
                    h_lines.append(round(p1.y, 1))
            elif item[0] == 're':
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
        raw_name = page.get_text('text', clip=rect_name).strip()
        raw_notice = page.get_text('text', clip=rect_notice).strip()
        if raw_name.lower() in ['items', 'item'] and ('notice' in raw_notice.lower() or 'photos' in page.get_text('text', clip=fitz.Rect(COL_PHOTO[0], y0, COL_PHOTO[1], y1)).lower()):
            continue

        row_imgs = []
        for xref, r in page_images:
            cy = (r.y0 + r.y1) / 2
            if y0 <= cy <= y1 or (r.y0 >= y0 - 8 and r.y1 <= y1 + 8) or (r.y0 < y1 and r.y1 > y0):
                row_imgs.append((xref, r))

        if not raw_name and raw_notice and current_prod:
            current_prod['specification'] += '\n' + raw_notice
            if row_imgs and not current_prod['image_xrefs']:
                current_prod['image_xrefs'].extend(row_imgs)
            continue
        if not raw_name and not raw_notice:
            continue

        clean_name = ' '.join(raw_name.split())
        current_prod = {
            'page': page_num,
            'row': i,
            'name': clean_name,
            'specification': raw_notice,
            'image_xrefs': row_imgs
        }
        products.append(current_prod)

with open('data/products.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

db_names = set()
db_name_specs = []
for c in db:
    for item in c.get('equipmentHighlights', []):
        norm = re.sub(r'[^a-z0-9]+', '', item['name'].lower())
        db_names.add(norm)
        db_name_specs.append((c['slug'], item['name'], norm, (item.get('specification') or '')[:50]))

print('Total extracted PDF products:', len(products))
for p in products:
    norm = re.sub(r'[^a-z0-9]+', '', p['name'].lower())
    if norm not in db_names:
        print(f"MISSING p.{p['page']}: {p['name']} | imgs={len(p['image_xrefs'])} | spec={p['specification'][:60].replace(chr(10), ' ')}")

