import json
with open('scratch/sync_report.json', 'r', encoding='utf-8') as f:
    r = json.load(f)
print("EXACT MATCHES:")
for m in r['exact_matches']:
    print(f"  PDF: {m[0]} <==> DB: {m[1]} ({m[2]})")
print(f"\nNEAR MATCHES ({len(r['near_matches'])}):")
for m in r['near_matches']:
    print(f"  PDF: {m[0]} <==> DB: {m[1]} [Score: {m[2]}, Cat: {m[3]}]")
