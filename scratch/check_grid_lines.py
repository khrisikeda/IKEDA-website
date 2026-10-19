import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz

pdf_path = r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf'
doc = fitz.open(pdf_path)

for pno in [0, 1, 17, 27]: # Pages 1, 2, 18, 28
    page = doc[pno]
    drawings = page.get_drawings()
    print(f"\nPage {pno + 1} drawings count: {len(drawings)}")
    # Find horizontal lines that define row borders (y coordinates)
    h_lines = []
    for d in drawings:
        for item in d["items"]:
            if item[0] == "l": # line (p1, p2)
                p1, p2 = item[1], item[2]
                if abs(p1.y - p2.y) < 1 and abs(p1.x - p2.x) > 100:
                    h_lines.append(round(p1.y, 1))
            elif item[0] == "re": # rect
                r = item[1]
                if r.height < 2 and r.width > 100:
                    h_lines.append(round(r.y0, 1))
    h_lines = sorted(list(set(h_lines)))
    print(f"  Horizontal grid lines ({len(h_lines)}): {h_lines}")
