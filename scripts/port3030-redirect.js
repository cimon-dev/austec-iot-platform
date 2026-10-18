const http = require('http');

const server = http.createServer((req, res) => {
  const targetUrl = `http://localhost:3000${req.url}`;
  res.writeHead(307, { 'Location': targetUrl });
  res.end();
});

server.listen(3030, () => {
  console.log('[PORT REDIRECT] Port 3030 is forwarding to http://localhost:3000');
});
