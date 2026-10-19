import fitz  # PyMuPDF
import os
import sys

pdf_path = r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf'
doc = fitz.open(pdf_path)

print(f"Total pages: {len(doc)}")

for page_num in range(min(5, len(doc))):
    page = doc[page_num]
    text = page.get_text("text")
    images = page.get_images(full=True)
    tables = page.find_tables()
    print(f"--- Page {page_num + 1} ---")
    print(f"Images count: {len(images)}")
    print(f"Tables found: {len(tables.tables) if tables else 0}")
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    print(f"First 10 lines: {lines[:10]}")
