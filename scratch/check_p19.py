import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz

doc = fitz.open(r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf')
page19 = doc[18] # 0-indexed page 19

for b in page19.get_text("blocks"):
    print(f"y0={b[1]:.1f}, y1={b[3]:.1f}: {repr(' '.join(b[4].split()))}")
