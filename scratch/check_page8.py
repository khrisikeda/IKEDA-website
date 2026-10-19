import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz

pdf_path = r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf'
doc = fitz.open(pdf_path)

page = doc[7] # Page 8
print("Page 8 raw text blocks:")
for b in page.get_text("blocks"):
    print(" ", b)

print("\nPage 8 table extract:")
tables = page.find_tables()
if tables and tables.tables:
    t = tables.tables[0]
    for r_idx, row in enumerate(t.extract()):
        print(f" Row {r_idx}: {row}")
