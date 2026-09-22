const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '..', 'data', 'company.json');

// GET /api/company - mission, vision, contact, map links, etc.
router.get('/', (req, res) => {
  res.json(JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')));
});

module.exports = router;
