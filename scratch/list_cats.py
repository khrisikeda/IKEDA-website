import json

with open('data/products.json', 'r', encoding='utf-8') as f:
    cats = json.load(f)

for c in cats:
    print(f"Slug: {c['slug']}, Name: {c['name']}, Group: {c['departmentGroup']}")
