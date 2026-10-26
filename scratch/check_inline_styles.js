const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const htmlFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

htmlFiles.forEach(file => {
  const content = fs.readFileSync(path.join(publicDir, file), 'utf8');
  const styleMatches = content.match(/style=["'][^"']*["']/gi) || [];
  console.log(`\n=== ${file} (${styleMatches.length} inline styles) ===`);
  styleMatches.forEach(sm => {
    // filter out harmless display: none or simple width
    if (sm.toLowerCase().includes('glow') || 
        sm.toLowerCase().includes('shadow') || 
        sm.toLowerCase().includes('gradient') ||
        sm.toLowerCase().includes('#060a12') ||
        sm.toLowerCase().includes('#0a0f1d') ||
        sm.toLowerCase().includes('rgba')) {
      console.log('  Suspicious:', sm);
    }
  });
});
