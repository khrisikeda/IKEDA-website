import sys
sys.stdout.reconfigure(encoding='utf-8')
import json

with open('data/products.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

seen = set()
for c in db:
    for item in c['equipmentHighlights']:
        name = item['name']
        if name in seen:
            continue
        seen.add(name)
        if '\ufffd' in name or any(ord(ch) > 127 and ch not in '°±≥≤×–—℃•·ΩΔΦφ' for ch in name):
            print(f"Non-ascii in name: {repr(name)}")
