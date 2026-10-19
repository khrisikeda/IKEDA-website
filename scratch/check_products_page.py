import urllib.request

req = urllib.request.urlopen("http://localhost:8080/products")
html = req.read().decode('utf-8')
print("Status:", req.status)
print("Page length:", len(html))
print("Contains 'Ikeda Endoscopy Africa'?", "Ikeda" in html)
print("Contains 'products.js'?", "products.js" in html)
print("Contains modal backdrop?", "product-modal-backdrop" in html)
print("Contains product-modal-content?", "product-modal-content" in html)
