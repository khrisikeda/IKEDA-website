import sys
sys.stdout.reconfigure(encoding='utf-8')
import fitz

doc = fitz.open(r'C:\Users\user\.gemini\antigravity-ide\brain\10257338-be1e-4fc7-8287-55ac27a09d03\.user_uploaded\media_1792392140147.pdf')

SECTIONS = [
    "General Medical Devices",
    "Surgical & Operating",
    "Emergency & ICU Equipment",
    "Cardiothoracic & Pulmonary",
    "Neurology",
    "Gynecology & Obstetrics",
    "Pediatric & Neonatal",
    "Urology",
    "Orthopedics",
    "Physiotherapy",
    "Ophthalmology",
    "ENT",
    "Dentistry",
    "Sterilizing & Reprocessing",
    "Laboratory"
]

print("Scanning all pages for true section headers...")
for pno in range(len(doc)):
    page = doc[pno]
    blocks = page.get_text("blocks")
    for b in blocks:
        txt = " ".join(b[4].split()).strip()
        # Look for section matches
        for sec in SECTIONS:
            # Look at exact or close matches
            if b[4].strip() == sec or txt == sec:
                print(f"Page {pno+1} [y={b[1]:.1f}, x={b[0]:.1f}]: '{txt}'")
            elif sec == "ENT" and txt == "ENT":
                print(f"Page {pno+1} [y={b[1]:.1f}, x={b[0]:.1f}]: ENT found")
