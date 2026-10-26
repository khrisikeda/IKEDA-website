const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'main.css'), 'utf8');
const findProductsClasses = require('./find_products_classes.js');

// Read dynamic classes from products.js
const pContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'products.js'), 'utf8');
const classMatches = pContent.matchAll(/class=['"]([^'"]+)['"]/g);
const classes = new Set();
for (const m of classMatches) {
  m[1].split(/\s+/).filter(Boolean).forEach(c => {
    if (!c.includes('$')) classes.add(c);
  });
}

const missing = [];
classes.forEach(cls => {
  const regex = new RegExp('\\.' + cls + '(?![a-zA-Z0-9_-])');
  if (!regex.test(css)) {
    missing.push(cls);
  }
});

console.log('Total products.js dynamic classes checked:', classes.size);
console.log('Classes not explicitly in CSS (' + missing.length + '):', missing);
