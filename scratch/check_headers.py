import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz

doc = fitz.open(r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf')

for pno in [0, 18, 24, 27, 28, 30, 31, 34, 36, 40, 54, 61, 77, 79]:
    page = doc[pno]
    print(f"\n--- Page {pno+1} blocks ---")
    for b in page.get_text("blocks"):
        txt = b[4].strip()
        if len(txt) < 50:
            print(f"  y={b[1]:.1f}, x={b[0]:.1f}: {repr(txt)}")
