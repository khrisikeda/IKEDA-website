import json

with open('data/products.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for i, cat in enumerate(data):
    eq = cat.get('equipmentHighlights', [])
    types = set(type(x).__name__ for x in eq)
    sample = eq[0] if eq else None
    print(f"{i}: {cat.get('name')} | Group: {cat.get('departmentGroup')} | {len(eq)} items | types: {types}")
    if isinstance(sample, dict):
        print(f"   dict keys: {list(sample.keys())}")
