import json

with open('data/products.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

for c in db:
    print(f"\n=== {c['name']} ({len(c['equipmentHighlights'])}) ===")
    for item in c['equipmentHighlights']:
        print(f"  - {item['name']} (img: {bool(item['image'])}, lines: {len(item['features'])})")
