import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz

doc = fitz.open(r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf')
page62 = doc[61]

imgs = page62.get_images()
print("Images on page 62:", imgs)
for img in imgs:
    xref = img[0]
    smask = img[1]
    print(f"Xref {xref}, smask={smask}")
    
    # Check pixmap with smask
    pix = fitz.Pixmap(doc, xref)
    print(f"  Pixmap: colorspace={pix.colorspace.name}, alpha={pix.alpha}, size={pix.width}x{pix.height}")
    
    if smask > 0:
        mask_pix = fitz.Pixmap(doc, smask)
        print(f"  Mask pixmap: colorspace={mask_pix.colorspace.name}, size={mask_pix.width}x{mask_pix.height}")
        # Merge pixmap with mask
        composite = fitz.Pixmap(pix, mask_pix)
        print(f"  Composite: alpha={composite.alpha}, size={composite.width}x{composite.height}")
        composite.save("scratch/test_dental_chair_masked.png")
