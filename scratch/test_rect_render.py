import fitz

doc = fitz.open(r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf')
page62 = doc[61]
print("Rects for 350:", page62.get_image_rects(350))
r = page62.get_image_rects(350)[0]

# Render just that image rect at 4x zoom!
pix = page62.get_pixmap(matrix=fitz.Matrix(4.0, 4.0), clip=r)
pix.save("scratch/chair_rect_render.png")
print(f"Rendered chair rect: {pix.width}x{pix.height}")
