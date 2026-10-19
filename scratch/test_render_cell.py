import fitz

doc = fitz.open(r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf')
page62 = doc[61]

# Let's render the actual page area containing the dental chair at 4x zoom!
rect = fitz.Rect(110.0, 500.0, 280.0, 750.0)
pix = page62.get_pixmap(matrix=fitz.Matrix(4.0, 4.0), clip=rect)
pix.save("scratch/page62_rendered_cell.png")
print("Rendered page62 cell directly!")
