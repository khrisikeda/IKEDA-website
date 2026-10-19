import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz
import os
import re

pdf_path = r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf'
doc = fitz.open(pdf_path)

print(f"Total pages: {len(doc)}")

# First, collect all section headings and their pages
headings = []
for pno in range(len(doc)):
    page = doc[pno]
    blocks = page.get_text("blocks")
    for b in blocks:
        txt = b[4].strip()
        lines = [l.strip() for l in txt.splitlines() if l.strip()]
        if len(lines) == 1 and lines[0] in [
            "General Medical Devices", "Surgical & Operating", "Emergency & ICU Equipment",
            "Cardiothoracic & Pulmonary", "Neurology", "Gynecology & Obstetrics",
            "Pediatric & Neonatal", "Urology", "Orthopedics", "Physiotherapy",
            "Ophthalmology", "ENT", "Dentistry", "Sterilizing & Reprocessing", "Laboratory"
        ]:
            headings.append((pno + 1, lines[0], b[1]))
        elif len(lines) == 2 and lines[0] in ["General Medical", "Surgical &", "Emergency & ICU", "Cardiothoracic &", "Gynecology &", "Pediatric &", "Sterilizing &"]:
            full_title = f"{lines[0]} {lines[1]}"
            headings.append((pno + 1, full_title, b[1]))

print("Found headings:")
for h in headings:
    print(f"  Page {h[0]}: {h[1]} (y={h[2]:.1f})")
