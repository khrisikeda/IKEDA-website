const fs = require('fs');
const path = require('path');

const jsFiles = ['products.js', 'home-interactive.js', 'main.js', 'articles-modal.js', 'contact.js', 'ai-chat.js'];
const allSelectors = new Set();

jsFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', 'public', 'js', file);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');

  // match querySelector / querySelectorAll
  const qMatches = content.matchAll(/(?:querySelector|querySelectorAll)\(['"]([^'"]+)['"]/g);
  for (const m of qMatches) {
    allSelectors.add(`${file} -> query: ${m[1]}`);
  }

  // match classList
  const clMatches = content.matchAll(/classList\.(?:add|remove|toggle|contains)\(['"]([^'"]+)['"]/g);
  for (const m of clMatches) {
    allSelectors.add(`${file} -> class: ${m[1]}`);
  }

  // match getElementById
  const idMatches = content.matchAll(/getElementById\(['"]([^'"]+)['"]/g);
  for (const m of idMatches) {
    allSelectors.add(`${file} -> id: ${m[1]}`);
  }
});

console.log(Array.from(allSelectors).sort().join('\n'));
