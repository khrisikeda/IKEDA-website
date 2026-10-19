import urllib.request
import json

req = urllib.request.urlopen("http://localhost:8080/api/products")
data = json.loads(req.read().decode('utf-8'))

tested = 0
errors = 0
for c in data:
    for item in c.get("equipmentHighlights", []):
        img = item.get("image")
        if img:
            tested += 1
            url = f"http://localhost:8080{img}"
            try:
                res = urllib.request.urlopen(url)
                if res.status != 200:
                    print(f"Error {res.status} on {url}")
                    errors += 1
            except Exception as e:
                print(f"Failed to fetch {url}: {e}")
                errors += 1

print(f"Tested {tested} images, {errors} errors.")
