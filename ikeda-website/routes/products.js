const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '..', 'data', 'products.json');

function readProducts() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

// GET /api/products - all product categories
router.get('/', (req, res) => {
  res.json(readProducts());
});

// GET /api/products/:slug - a single category
router.get('/:slug', (req, res) => {
  const products = readProducts();
  const found = products.find((p) => p.slug === req.params.slug);
  if (!found) return res.status(404).json({ error: 'Category not found' });
  res.json(found);
});

module.exports = router;
