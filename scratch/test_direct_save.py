import fitz

doc = fitz.open(r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf')
pix = fitz.Pixmap(doc, 350)
pix.save("scratch/test_dental_chair_direct.png")
print("Saved directly with alpha:", pix.alpha)
