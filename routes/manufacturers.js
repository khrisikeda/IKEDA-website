const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '..', 'data', 'manufacturers.json');

function readManufacturers() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function writeManufacturers(list) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
}

// GET /api/manufacturers - list all
router.get('/', (req, res) => {
  res.json(readManufacturers());
});

// POST /api/manufacturers - add one
// NOTE: this is wide open for now (no auth). Before using this in
// production, add an admin login check here — see README "Next steps".
router.post('/', (req, res) => {
  const { name, categories, website, logo } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const list = readManufacturers();
  list.push({ name, categories: categories || [], website: website || '', logo: logo || '' });
  writeManufacturers(list);
  res.status(201).json({ success: true });
});

// DELETE /api/manufacturers/:name - remove one by exact name
router.delete('/:name', (req, res) => {
  const list = readManufacturers();
  const filtered = list.filter((m) => m.name !== req.params.name);
  if (filtered.length === list.length) {
    return res.status(404).json({ error: 'Manufacturer not found' });
  }
  writeManufacturers(filtered);
  res.json({ success: true });
});

module.exports = router;
