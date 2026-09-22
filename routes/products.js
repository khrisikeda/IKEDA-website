const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '..', 'data', 'products.json');

function readProducts() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

// GET /api/products - all categories, with optional search and department filtering
router.get('/', (req, res) => {
  let products = readProducts();
  const { search, group } = req.query;

  if (group && group !== 'All') {
    products = products.filter(
      (p) => p.departmentGroup && p.departmentGroup.toLowerCase() === group.toLowerCase()
    );
  }

  if (search) {
    const q = search.toLowerCase();
    products = products.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(q);
      const descMatch = p.description.toLowerCase().includes(q);
      const equipMatch = (p.equipmentHighlights || []).some((item) => item.toLowerCase().includes(q));
      return nameMatch || descMatch || equipMatch;
    });
  }

  res.json(products);
});

// GET /api/products/:slug - single category
router.get('/:slug', (req, res) => {
  const products = readProducts();
  const found = products.find((p) => p.slug === req.params.slug);
  if (!found) return res.status(404).json({ error: 'Category not found' });
  res.json(found);
});

module.exports = router;
