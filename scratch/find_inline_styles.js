const fs = require('fs');
const path = require('path');

const files = fs.readdirSync(path.join(__dirname, '..', 'public')).filter(f => f.endsWith('.html'));
files.forEach(f => {
  const content = fs.readFileSync(path.join(__dirname, '..', 'public', f), 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('style=') && (l.includes('background') || l.includes('gradient') || l.includes('box-shadow') || l.includes('rgba'))) {
      console.log(`${f}:${i+1}: ${l.trim()}`);
    }
  });
});
