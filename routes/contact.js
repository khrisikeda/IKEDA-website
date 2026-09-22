const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'messages.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
  }
}

function readMessages() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (err) {
    return [];
  }
}

function writeMessages(list) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
}

// POST /api/contact - save customer inquiry
router.post('/', (req, res) => {
  const { name, email, phone, message, department } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  const messages = readMessages();
  const entry = {
    id: 'MSG-' + Date.now(),
    name: name.trim(),
    email: (email || '').trim(),
    phone: (phone || '').trim(),
    department: (department || 'General Inquiry').trim(),
    message: message.trim(),
    receivedAt: new Date().toISOString(),
  };

  messages.unshift(entry);
  writeMessages(messages);

  res.status(201).json({ success: true, id: entry.id });
});

// GET /api/contact - list messages (for demo/admin purposes)
router.get('/', (req, res) => {
  res.json(readMessages());
});

module.exports = router;
