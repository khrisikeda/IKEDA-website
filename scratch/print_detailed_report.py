import sys
sys.stdout.reconfigure(encoding='utf-8')
import json

with open(r'c:\Users\user\Downloads\ikeda-endoscopy-africa-website\scratch\sync_report.json', 'r', encoding='utf-8') as f:
    r = json.load(f)

print(f"=== EXACT MATCHES ({len(r['exact_matches'])}) ===")
for m in r['exact_matches']:
    print(f"  PDF: '{m[0]}' == DB: '{m[1]}' ({m[2]})")

print(f"\n=== NEAR MATCHES NEEDING REVIEW ({len(r['near_matches'])}) ===")
for m in r['near_matches']:
    print(f"  PDF: '{m[0]}' <==> DB: '{m[1]}' [Score: {m[2]}, Category: {m[3]}]")

print(f"\n=== PRODUCTS IN PDF TO ADD ({len(r['pdf_to_add'])}) ===")
print("First 20:")
for p in r['pdf_to_add'][:20]:
    print(f"  Page {p[2]} [{p[1]}]: '{p[0]}' (has_img: {bool(p[3])}, has_spec: {p[4]})")

print(f"\n=== PRODUCTS IN DB TO REMOVE (AWAITING CONFIRMATION) ({len(r['db_to_remove'])}) ===")
print("First 20:")
for d in r['db_to_remove'][:20]:
    print(f"  [{d[1]} | {d[2]}]: '{d[0]}'")

print(f"\n=== PDF ITEMS MISSING IMAGE ({len(r['missing_image'])}) ===")
for mi in r['missing_image']:
    print(f"  '{mi}'")

print(f"\n=== PDF ITEMS MISSING NOTICE/SPEC ({len(r['missing_spec'])}) ===")
for ms in r['missing_spec']:
    print(f"  '{ms}'")
