const express = require('express');
const path = require('path');

const productsRouter = require('./routes/products');
const manufacturersRouter = require('./routes/manufacturers');
const contactRouter = require('./routes/contact');
const companyRouter = require('./routes/company');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/products', productsRouter);
app.use('/api/manufacturers', manufacturersRouter);
app.use('/api/contact', contactRouter);
app.use('/api/company', companyRouter);

// Fallback: serve index.html for any non-API route (simple multi-page site,
// but keeps this safe if you later turn it into a single-page app)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Ikeda Endoscopy Africa site running at http://localhost:${PORT}`);
});
