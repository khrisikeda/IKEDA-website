from PIL import Image, ImageChops, ImageEnhance, ImageFilter

im = Image.open("scratch/chair_rect_render.png").convert("RGB")

# Find bounding box of non-white content
# White is (255, 255, 255)
bg = Image.new("RGB", im.size, (255, 255, 255))
diff = ImageChops.difference(im, bg)
bbox = diff.getbbox()
print("Bounding box of product:", bbox)

if bbox:
    cropped = im.crop(bbox)
else:
    cropped = im

cw, ch = cropped.size
print(f"Cropped product size: {cw}x{ch}")

# Target canvas 1000x1000
CANVAS_SIZE = 1000
TARGET_PRODUCT_SIZE = 920 # 92% of canvas, big!

scale = TARGET_PRODUCT_SIZE / max(cw, ch)
new_w = int(round(cw * scale))
new_h = int(round(ch * scale))

resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
# Gentle sharpening for crisp edges
sharp = resized.filter(ImageFilter.UnsharpMask(radius=1.2, percent=125, threshold=2))
enhanced = ImageEnhance.Sharpness(sharp).enhance(1.08)

canvas = Image.new("RGB", (CANVAS_SIZE, CANVAS_SIZE), (255, 255, 255))
paste_x = (CANVAS_SIZE - new_w) // 2
paste_y = (CANVAS_SIZE - new_h) // 2

canvas.paste(enhanced, (paste_x, paste_y))
canvas.save("scratch/test_uniform_big_chair.jpeg", quality=98, optimize=True)
print(f"Final standardized big product image: {canvas.size}, product size: {new_w}x{new_h}")
