import os
import fitz

img_dir = r"public/images/products"
files = [f for f in os.listdir(img_dir) if os.path.isfile(os.path.join(img_dir, f))]

print(f"Total image files: {len(files)}")
sizes = []
for f in files:
    path = os.path.join(img_dir, f)
    try:
        pix = fitz.Pixmap(path)
        sizes.append((pix.width, pix.height, f))
    except Exception as e:
        print(f"Error {f}: {e}")

sizes.sort()
print("\nSmallest 20 images (width, height, filename):")
for w, h, f in sizes[:20]:
    print(f"  {w}x{h} : {f}")

print("\nLargest 15 images:")
for w, h, f in sizes[-15:]:
    print(f"  {w}x{h} : {f}")
