const http = require('http');

const postData = JSON.stringify({
  message: "Hello, I am setting up an operating theatre for laparoscopy. What tower do you recommend?"
});

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/ai/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('AI Chat Status:', res.statusCode);
    try {
      const parsed = JSON.parse(body);
      console.log('AI Chat Response Preview:', parsed.reply ? parsed.reply.slice(0, 150) + '...' : parsed);
    } catch(e) {
      console.log('Response body:', body.slice(0, 150));
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(postData);
req.end();
