const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '..', 'data', 'messages.json');

function readMessages() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function writeMessages(list) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
}

// POST /api/contact - save an inquiry
// NOTE: this currently just saves to a local JSON file so the form works
// out of the box. See README "Next steps" for wiring up real email delivery.
router.post('/', (req, res) => {
  const { name, email, phone, message } = req.body;
  if (!name || !message) {
    return res.status(400).json({ error: 'name and message are required' });
  }

  const messages = readMessages();
  messages.push({
    name,
    email: email || '',
    phone: phone || '',
    message,
    receivedAt: new Date().toISOString(),
  });
  writeMessages(messages);

  res.status(201).json({ success: true });
});

module.exports = router;
