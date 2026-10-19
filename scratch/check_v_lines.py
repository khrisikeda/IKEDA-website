import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz

pdf_path = r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf'
doc = fitz.open(pdf_path)

for pno in [0, 1, 17, 27, 61]:
    page = doc[pno]
    drawings = page.get_drawings()
    v_lines = []
    for d in drawings:
        for item in d["items"]:
            if item[0] == "l": # line (p1, p2)
                p1, p2 = item[1], item[2]
                if abs(p1.x - p2.x) < 1 and abs(p1.y - p2.y) > 50:
                    v_lines.append(round(p1.x, 1))
            elif item[0] == "re": # rect
                r = item[1]
                if r.width < 2 and r.height > 50:
                    v_lines.append(round(r.x0, 1))
    v_lines = sorted(list(set(v_lines)))
    print(f"Page {pno + 1} vertical grid lines ({len(v_lines)}): {v_lines}")
