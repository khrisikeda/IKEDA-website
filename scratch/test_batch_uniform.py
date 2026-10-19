import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz
from PIL import Image, ImageChops, ImageEnhance, ImageFilter
import os

doc = fitz.open(r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf')

def process_product_image(page_num, image_rect, out_filename):
    page = doc[page_num - 1]
    
    # Inset slightly (2 points) to avoid table borders
    inset_r = fitz.Rect(image_rect.x0 + 2, image_rect.y0 + 2, image_rect.x1 - 2, image_rect.y1 - 2)
    
    # 4.5x zoom render for razor sharp resolution
    pix = page.get_pixmap(matrix=fitz.Matrix(4.5, 4.5), clip=inset_r)
    tmp_path = "scratch/temp_crop.png"
    pix.save(tmp_path)
    
    with Image.open(tmp_path).convert("RGB") as im:
        # Autocrop white border
        bg = Image.new("RGB", im.size, (255, 255, 255))
        diff = ImageChops.difference(im, bg)
        # Threshold slightly (pixels with diff > 10)
        gray = diff.convert("L").point(lambda p: 255 if p > 12 else 0)
        bbox = gray.getbbox()
        
        if bbox:
            cropped = im.crop(bbox)
        else:
            cropped = im
            
        cw, ch = cropped.size
        
        CANVAS_SIZE = 1000
        TARGET_PRODUCT_SIZE = 920 # 92% of canvas, big!
        
        scale = TARGET_PRODUCT_SIZE / max(cw, ch)
        new_w = int(round(cw * scale))
        new_h = int(round(ch * scale))
        
        resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
        sharp = resized.filter(ImageFilter.UnsharpMask(radius=1.2, percent=125, threshold=2))
        enhanced = ImageEnhance.Sharpness(sharp).enhance(1.08)
        
        canvas = Image.new("RGB", (CANVAS_SIZE, CANVAS_SIZE), (255, 255, 255))
        paste_x = (CANVAS_SIZE - new_w) // 2
        paste_y = (CANVAS_SIZE - new_h) // 2
        
        canvas.paste(enhanced, (paste_x, paste_y))
        
        out_path = os.path.join("scratch", out_filename)
        canvas.save(out_path, "JPEG", quality=98, optimize=True)
        print(f"Page {page_num}: saved {out_path} -> 1000x1000 (product {new_w}x{new_h})")

# Test 1: Page 1 Mayo trolley
page1 = doc[0]
rect1 = page1.get_image_rects(page1.get_images()[1][0])[0]
process_product_image(1, rect1, "test_mayo_1000.jpeg")

# Test 2: Page 5 Motorized hospital bed
page5 = doc[4]
rect5 = page5.get_image_rects(page5.get_images()[0][0])[0]
process_product_image(5, rect5, "test_bed_1000.jpeg")

# Test 3: Page 75 Curing lights Q1
page75 = doc[74]
rect75 = page75.get_image_rects(page75.get_images()[0][0])[0]
process_product_image(75, rect75, "test_curing_q1_1000.jpeg")

# Test 4: Page 44 Slit lamp 66 Vision
page44 = doc[43]
rect44 = page44.get_image_rects(page44.get_images()[1][0])[0]
process_product_image(44, rect44, "test_slit_lamp_1000.jpeg")
