const express = require('express');
const path = require('path');

const productsRouter = require('./routes/products');
const manufacturersRouter = require('./routes/manufacturers');
const contactRouter = require('./routes/contact');
const companyRouter = require('./routes/company');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets with automatic .html extension resolution
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html', 'htm']
}));

// API Routes
app.use('/api/products', productsRouter);
app.use('/api/manufacturers', manufacturersRouter);
app.use('/api/contact', contactRouter);
app.use('/api/company', companyRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Ikeda Endoscopy Africa Web Service',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Explicit clean routes for primary pages
const cleanPages = ['about', 'products', 'manufacturers', 'contact'];
cleanPages.forEach((page) => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', `${page}.html`));
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 Fallback
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Central error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`Ikeda Endoscopy Africa site running at http://localhost:${PORT}`);
});
