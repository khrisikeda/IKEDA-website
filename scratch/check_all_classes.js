const fs = require('fs');
const path = require('path');

const htmlClasses = JSON.parse(fs.readFileSync(path.join(__dirname, 'html_classes.json'), 'utf8'));
const jsFiles = ['products.js', 'home-interactive.js', 'main.js', 'articles-modal.js', 'contact.js', 'ai-chat.js'];
const jsClasses = new Set();

jsFiles.forEach(file => {
  const content = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', file), 'utf8');
  // Look for class names in strings
  const stringLiterals = content.match(/['"`]([a-zA-Z0-9_\-\s]+)['"`]/g) || [];
  stringLiterals.forEach(lit => {
    const val = lit.slice(1, -1).trim();
    if (/^[a-zA-Z0-9_-]+$/.test(val) && val.length > 2 && !val.includes('/') && !val.includes(' ') && !val.includes(':')) {
      jsClasses.add(val);
    }
  });
});

console.log('HTML classes count:', htmlClasses.length);
console.log('Sample HTML classes:', htmlClasses.slice(0, 30));
