const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'main.css'), 'utf8');
const htmlClasses = JSON.parse(fs.readFileSync(path.join(__dirname, 'html_classes.json'), 'utf8'));

const missing = [];
htmlClasses.forEach(cls => {
  // Check if class appears as .cls in CSS
  const regex = new RegExp('\\.' + cls + '(?![a-zA-Z0-9_-])');
  if (!regex.test(css)) {
    missing.push(cls);
  }
});

console.log('Total HTML classes checked:', htmlClasses.length);
console.log('Classes not explicitly in CSS (' + missing.length + '):', missing);
