import urllib.request
import json

req = urllib.request.urlopen("http://localhost:8080/api/products")
data = json.loads(req.read().decode('utf-8'))
print(f"Total categories returned: {len(data)}")
total_prods = sum(len(c.get("equipmentHighlights", [])) for c in data)
print(f"Total product instances across categories: {total_prods}")

# Sample a few products
sample = data[0]["equipmentHighlights"][0]
print("Sample product:", sample["name"])
print("Sample image:", sample["image"])
print("Sample spec length:", len(sample["specification"]))
