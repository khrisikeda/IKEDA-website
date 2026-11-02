import sys
sys.stdout.reconfigure(encoding='utf-8')
import pymupdf as fitz
import os
import re
import json
from PIL import Image, ImageChops, ImageEnhance, ImageFilter

pdf_path = r'C:\Users\user\.gemini\antigravity\brain\e7dc28d2-7f08-402f-a29e-724c720f4982\.user_uploaded\media_1793624610154_f7709bb1.pdf'
doc = fitz.open(pdf_path)
output_img_dir = r'c:\Users\user\Downloads\ikeda-endoscopy-africa-website\public\images\products'

COL_NAME = (40.0, 115.0)
COL_PHOTO = (110.0, 280.0)
COL_NOTICE = (415.0, 585.0)

CANVAS_SIZE = 1000
TARGET_SIZE = 920

def make_slug(name):
    s = name.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s[:60] if s else 'product'

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

def render_and_save_image(prod, filename):
    if not prod['image_xrefs']:
        return None
    out_filepath = os.path.join(output_img_dir, filename)
    page = doc[prod['page'] - 1]
    img_rect = prod['image_xrefs'][0][1]
    clip_rect = fitz.Rect(img_rect.x0 + 1.5, img_rect.y0 + 1.5, img_rect.x1 - 1.5, img_rect.y1 - 1.5)
    pix = page.get_pixmap(matrix=fitz.Matrix(4.5, 4.5), clip=clip_rect)
    tmp_path = os.path.join('scratch', 'temp_render_new.png')
    pix.save(tmp_path)

    with Image.open(tmp_path).convert('RGB') as im:
        bg = Image.new('RGB', im.size, (255, 255, 255))
        diff = ImageChops.difference(im, bg)
        mask = diff.convert('L').point(lambda val: 255 if val > 12 else 0)
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
        canvas = Image.new('RGB', (CANVAS_SIZE, CANVAS_SIZE), (255, 255, 255))
        paste_x = (CANVAS_SIZE - new_w) // 2
        paste_y = (CANVAS_SIZE - new_h) // 2
        canvas.paste(enhanced, (paste_x, paste_y))
        canvas.save(out_filepath, 'JPEG', quality=98, optimize=True)
    return f'/images/products/{filename}'

def make_item_dict(prod, img_url, cat_name, subtitle=None):
    spec = prod['specification'].strip()
    features = [line.strip() for line in spec.split('\n') if line.strip()]
    item = {
        'name': prod['name'],
        'image': img_url,
        'specification': spec,
        'features': features[:16],
        'category': cat_name
    }
    if subtitle:
        item['subtitle'] = subtitle
    return item

# Load existing products.json
with open('data/products.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

cat_map = {c['slug']: c for c in db}

# Find the target products in parsed `products`
target_names = [
    'Portable surgical light 2012L-1',
    'Syringe pump MS51EC',
    'Syringe pump Graseby2100',
    'Syringe pump MS37plus',
    'Infusion pump MI 23',
    'Infusion pump Graseby1200',
    'Infusion pump MI 27plus',
    'Infrared therapy light YSHT-IIA',
    'Infrared therapy light YSHT-II',
    'A/B Ultrasound'
]

found_prods = {}
for p in products:
    if p['name'] in target_names:
        found_prods[p['name']] = p

print('Found target products in PDF:', list(found_prods.keys()))

added_report = []

# 1. Portable surgical light 2012L-1 -> Operating Theatre (General Operating Theatre Equipment)
if 'Portable surgical light 2012L-1' in found_prods:
    p = found_prods['Portable surgical light 2012L-1']
    img_url = render_and_save_image(p, 'portable-surgical-light-2012l-1.jpeg')
    ot = cat_map['operating-theatre']
    exists = any('2012l-1' in h['name'].lower() or '2012-1' in h['name'].lower() for h in ot['equipmentHighlights'])
    if not exists:
        item_obj = make_item_dict(p, img_url, 'Operating Theatre', 'General Operating Theatre Equipment')
        # Insert right before Portable surgical light (2012-5)
        idx = next((i for i, h in enumerate(ot['equipmentHighlights']) if '2012' in h['name']), 6)
        ot['equipmentHighlights'].insert(idx, item_obj)
        # Also add to subsection 'General Operating Theatre Equipment'
        for sub in ot.get('subsections', []):
            if 'General Operating Theatre' in sub.get('title', ''):
                sub_idx = next((i for i, h in enumerate(sub['items']) if '2012' in h['name']), len(sub['items']))
                sub['items'].insert(sub_idx, item_obj)
        added_report.append(('Portable surgical light 2012L-1', 'Operating Theatre'))

# 2. 6 Syringe & Infusion Pumps -> Intensive Care Unit (ICU) & Emergency & Casualty Care
pump_names = [
    'Syringe pump MS51EC',
    'Syringe pump Graseby2100',
    'Syringe pump MS37plus',
    'Infusion pump MI 23',
    'Infusion pump Graseby1200',
    'Infusion pump MI 27plus'
]
for pname in pump_names:
    if pname in found_prods:
        p = found_prods[pname]
        fname = f"{make_slug(pname)}.jpeg"
        img_url = render_and_save_image(p, fname)
        for slug in ['intensive-care', 'emergency']:
            cat = cat_map[slug]
            exists = any(h['name'].lower() == pname.lower() for h in cat['equipmentHighlights'])
            if not exists:
                item_obj = make_item_dict(p, img_url, cat['name'])
                cat['equipmentHighlights'].append(item_obj)
                added_report.append((pname, cat['name']))

# 3. Infrared therapy light YSHT-IIA & YSHT-II -> Physiotherapy & Rehabilitation
physio = cat_map['physiotherapy']
if 'Infrared therapy light YSHT-IIA' in found_prods and 'Infrared therapy light YSHT-II' in found_prods:
    p_iia = found_prods['Infrared therapy light YSHT-IIA']
    p_ii = found_prods['Infrared therapy light YSHT-II']
    img_iia = render_and_save_image(p_iia, 'infrared-therapy-light-ysht-iia.jpeg')
    img_ii = render_and_save_image(p_ii, 'infrared-therapy-light-ysht-ii.jpeg')

    # Check if generic 'Infrared therapy light' exists; update it to YSHT-IIA and insert YSHT-II right after
    generic_idx = next((i for i, h in enumerate(physio['equipmentHighlights']) if h['name'].strip().lower() == 'infrared therapy light'), None)
    if generic_idx is not None:
        physio['equipmentHighlights'][generic_idx] = make_item_dict(p_iia, img_iia, physio['name'])
        added_report.append(('Infrared therapy light YSHT-IIA (updated model name & specs)', physio['name']))
        if not any(h['name'].lower() == 'infrared therapy light ysht-ii' for h in physio['equipmentHighlights']):
            physio['equipmentHighlights'].insert(generic_idx + 1, make_item_dict(p_ii, img_ii, physio['name']))
            added_report.append(('Infrared therapy light YSHT-II', physio['name']))
    else:
        for p_ir, img_ir in [(p_iia, img_iia), (p_ii, img_ii)]:
            if not any(h['name'].lower() == p_ir['name'].lower() for h in physio['equipmentHighlights']):
                physio['equipmentHighlights'].append(make_item_dict(p_ir, img_ir, physio['name']))
                added_report.append((p_ir['name'], physio['name']))

# 4. A/B Ultrasound -> Ophthalmology & Eye Care
if 'A/B Ultrasound' in found_prods:
    p = found_prods['A/B Ultrasound']
    img_url = render_and_save_image(p, 'ab-ultrasound-ophthalmology.jpeg')
    oph = cat_map['ophthalmology']
    exists = any('a/b ultrasound' in h['name'].lower() for h in oph['equipmentHighlights'])
    if not exists:
        item_obj = make_item_dict(p, img_url, oph['name'])
        # Insert after Optical frame heater COT-W84I (just like in the PDF p.47)
        idx = next((i + 1 for i, h in enumerate(oph['equipmentHighlights']) if 'cot-w84i' in h['name'].lower()), 8)
        oph['equipmentHighlights'].insert(idx, item_obj)
        added_report.append(('A/B Ultrasound', oph['name']))

with open('data/products.json', 'w', encoding='utf-8') as f:
    json.dump(db, f, indent=2, ensure_ascii=False)
    f.write('\n')

print('Successfully updated data/products.json! Added items:')
for name, cname in added_report:
    print(f'  + {name} -> {cname}')

