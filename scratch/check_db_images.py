import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz
import os
import re
import json
from PIL import Image, ImageChops, ImageEnhance, ImageFilter

doc = fitz.open(r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf')
output_img_dir = r'c:\Users\user\Downloads\ikeda-endoscopy-africa-website\public\images\products'

COL_PHOTO = (110.0, 280.0)

# Load existing products from data/products.json to get exact image_paths mapped
with open('data/products.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

# Collect all unique image paths
image_map = {} # path -> product info
for c in db:
    for item in c.get('equipmentHighlights', []):
        img = item.get('image')
        if img and img not in image_map:
            image_map[img] = item['name']

print(f"Total unique product image paths in db: {len(image_map)}")
