const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '..', 'data', 'manufacturers.json');

function readManufacturers() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

// GET /api/manufacturers - list all (read-only; edit data/manufacturers.json to change the list)
router.get('/', (req, res) => {
  res.json(readManufacturers());
});

module.exports = router;
