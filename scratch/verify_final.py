import json
import os
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('data/products.json', 'r', encoding='utf-8') as f:
    cats = json.load(f)

print(f"Total categories: {len(cats)}")

all_prods = []
missing_img = 0
has_img = 0
not_found = 0

for c in cats:
    for p in c.get('equipmentHighlights', []):
        all_prods.append(p)
        img = p.get('image')
        if img:
            has_img += 1
            local_path = os.path.join('public', img.lstrip('/'))
            if not os.path.exists(local_path):
                print(f"Missing file for {p['name']}: {local_path}")
                not_found += 1
        else:
            missing_img += 1

print(f"Total product references: {len(all_prods)}")
print(f"Products with valid image files: {has_img}")
print(f"Missing image files: {not_found}")
print(f"Products with placeholder/no image: {missing_img}")
