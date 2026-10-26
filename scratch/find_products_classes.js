const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'products.js'), 'utf8');
const classMatches = content.matchAll(/class=['"]([^'"]+)['"]/g);
const classes = new Set();
for (const m of classMatches) {
  m[1].split(/\s+/).filter(Boolean).forEach(c => classes.add(c));
}
console.log('Classes created dynamically in products.js (' + classes.size + '):');
console.log(Array.from(classes).sort().join(', '));
