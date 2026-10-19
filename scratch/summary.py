import sys
sys.stdout.reconfigure(encoding='utf-8')
import json

with open("scratch/sync_report.json", "r", encoding="utf-8") as f:
    rep = json.load(f)

print("=== EXACT MATCHES ===")
for m in rep["exact_matches"]:
    print(f"  PDF: '{m[0]}' == DB: '{m[1]}' ({m[2]})")

print("\n=== NEAR MATCHES ===")
for m in rep["near_matches"]:
    print(f"  PDF: '{m[0]}' <==> DB: '{m[1]}' [Score: {m[2]}, Cat: {m[3]}]")

print(f"\n=== DB ITEMS TO REMOVE ({len(rep['db_to_remove'])}) ===")
by_cat = {}
for name, cat, group in rep["db_to_remove"]:
    by_cat.setdefault(cat, []).append(name)

for cat, items in by_cat.items():
    print(f"\nCategory: {cat} ({len(items)} items)")
    for item in items:
        print(f"  - {item}")
