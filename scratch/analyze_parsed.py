import sys
sys.stdout.reconfigure(encoding='utf-8')
import json

with open(r'c:\Users\user\Downloads\ikeda-endoscopy-africa-website\scratch\parsed_products.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

print(f"Total entries: {len(products)}")

with_img = [p for p in products if p['images']]
with_spec = [p for p in products if p['specification']]
unnamed = [p for p in products if '[Unnamed' in p['name']]

print(f"Products with images: {len(with_img)}")
print(f"Products with specifications: {len(with_spec)}")
print(f"Unnamed entries: {len(unnamed)}")

if unnamed:
    print("\nUnnamed entries details:")
    for u in unnamed:
        print(f"  Page {u['page']}: cells={u['cells']} imgs={len(u['images'])}")

# Check duplicate names
name_counts = {}
for p in products:
    n = " ".join(p['name'].split()).lower()
    name_counts[n] = name_counts.get(n, 0) + 1

dups = {k: v for k, v in name_counts.items() if v > 1}
print(f"\nDuplicate names count: {len(dups)}")
for k, v in list(dups.items())[:15]:
    pages = [p['page'] for p in products if " ".join(p['name'].split()).lower() == k]
    print(f"  '{k}': {v} times on pages {pages}")
