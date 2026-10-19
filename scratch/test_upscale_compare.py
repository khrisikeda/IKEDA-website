import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz
from PIL import Image, ImageEnhance, ImageFilter
import os

doc = fitz.open(r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf')

page = doc[0]
rects = page.get_image_rects(page.get_images()[1][0])
print("Image rect on page 1:", rects)

mat = fitz.Matrix(4.0, 4.0)
pix = page.get_pixmap(matrix=mat, clip=rects[0])
print(f"Rendered crop size: {pix.width}x{pix.height}")

raw_img = doc.extract_image(page.get_images()[1][0])
print(f"Raw embedded image size: {raw_img['width']}x{raw_img['height']}")
