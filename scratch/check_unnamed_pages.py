import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz

pdf_path = r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf'
doc = fitz.open(pdf_path)

for pno in [7, 60, 61, 67]: # Pages 8, 61, 62, 68 (0-indexed: 7, 60, 61, 67)
    page = doc[pno]
    print(f"\n=== Page {pno + 1} ===")
    for b in page.get_text("blocks"):
        print(f"  bbox=({b[0]:.1f}, {b[1]:.1f}, {b[2]:.1f}, {b[3]:.1f}): {repr(b[4].strip())}")
