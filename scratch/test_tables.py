import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz

pdf_path = r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf'
doc = fitz.open(pdf_path)

for page_num in [0, 1, 2, 61]: # Check page 1, 2, 3, and 62
    page = doc[page_num]
    tables = page.find_tables()
    print(f"=== Page {page_num + 1} ===")
    if tables and tables.tables:
        t = tables.tables[0]
        print(f"Table bbox: {t.bbox}, row count: {t.row_count}, col count: {t.col_count}")
        df = t.extract()
        for r_idx, row in enumerate(df):
            row_clean = [str(c).replace('\n', ' ') if c else '' for c in row]
            print(f"  Row {r_idx}: {row_clean}")
    else:
        print("No table found")
