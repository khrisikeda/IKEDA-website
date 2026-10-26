const http = require('http');

const endpoints = [
  { path: '/', expected: 200 },
  { path: '/products', expected: 200 },
  { path: '/about', expected: 200 },
  { path: '/manufacturers', expected: 200 },
  { path: '/blog', expected: 200 },
  { path: '/contact', expected: 200 },
  { path: '/css/main.css?v=3.0', expected: 200 },
  { path: '/api/products', expected: 200 }
];

async function testEndpoint(ep) {
  return new Promise((resolve) => {
    http.get(`http://localhost:8080${ep.path}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const pass = res.statusCode === ep.expected;
        console.log(`${pass ? '✓' : '✗'} ${ep.path} -> Status: ${res.statusCode} (Bytes: ${body.length})`);
        resolve(pass);
      });
    }).on('error', (err) => {
      console.log(`✗ ${ep.path} -> Error: ${err.message}`);
      resolve(false);
    });
  });
}

async function run() {
  console.log('Testing endpoints on http://localhost:8080...');
  for (const ep of endpoints) {
    await testEndpoint(ep);
  }
}

run();
