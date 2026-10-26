const fs = require('fs');
const path = require('path');

const files = ['index.html', 'products.html', 'about.html', 'manufacturers.html', 'blog.html', 'contact.html'];
const allClasses = new Set();
const allIds = new Set();

files.forEach(f => {
  const content = fs.readFileSync(path.join(__dirname, '..', 'public', f), 'utf8');
  const classMatches = content.matchAll(/class=['"]([^'"]+)['"]/g);
  for (const m of classMatches) {
    m[1].split(/\s+/).filter(Boolean).forEach(c => allClasses.add(c));
  }
  const idMatches = content.matchAll(/id=['"]([^'"]+)['"]/g);
  for (const m of idMatches) {
    if (m[1]) allIds.add(m[1]);
  }
});

console.log('Total unique HTML classes:', allClasses.size);
console.log('Total unique HTML IDs:', allIds.size);
fs.writeFileSync(path.join(__dirname, 'html_classes.json'), JSON.stringify(Array.from(allClasses).sort(), null, 2));
fs.writeFileSync(path.join(__dirname, 'html_ids.json'), JSON.stringify(Array.from(allIds).sort(), null, 2));
