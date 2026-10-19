import fitz
from PIL import Image

doc = fitz.open(r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf')
pix = fitz.Pixmap(doc, 350)
print(f"Pixmap colorspace: {pix.colorspace.name}, alpha: {pix.alpha}")

# If we convert or composite over white:
if pix.alpha:
    # Save as PNG to scratch
    pix.save("scratch/clean_chair.png")
    # Open with PIL
    with Image.open("scratch/clean_chair.png") as im:
        # Composite on pure white background
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, (0, 0), im) # use alpha mask
        bg.save("scratch/clean_chair_white.jpeg", quality=98)
        print("Successfully pasted on clean white background!")
