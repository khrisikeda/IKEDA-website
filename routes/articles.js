const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '..', 'data', 'articles.json');

function readArticles() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

// GET /api/articles - all articles, with optional search or category filter
router.get('/', (req, res) => {
  let articles = readArticles();
  const { category, search } = req.query;

  if (category && category !== 'All') {
    articles = articles.filter(a => a.category && a.category.toLowerCase() === category.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase();
    articles = articles.filter(a => 
      a.title.toLowerCase().includes(q) ||
      a.excerpt.toLowerCase().includes(q) ||
      (a.tags && a.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  res.json(articles);
});

// GET /api/articles/:slug - single article
router.get('/:slug', (req, res) => {
  const articles = readArticles();
  const found = articles.find(a => a.slug === req.params.slug || a.id === req.params.slug);
  if (!found) {
    return res.status(404).json({ error: 'Article not found' });
  }
  res.json(found);
});

module.exports = router;
