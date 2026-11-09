// Lunzer: indoor wayfinding proof of concept for the Cloud Native Hackathon.
// Serves the static site in public/ and keeps /healthz and /readyz for the
// probes in deploy/. Listens on $PORT.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const port = Number(process.env.PORT || 8080);
const team = process.env.TEAM_NAME || 'your-team';
const version = process.env.APP_VERSION || 'dev';
const publicDir = path.join(__dirname, 'public');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// index.html is read once and stamped with the version, so the page shows
// which build is live.
const indexHtml = fs
  .readFileSync(path.join(publicDir, 'index.html'), 'utf8')
  .replaceAll('{{VERSION}}', escapeHtml(version))
  .replaceAll('{{TEAM}}', escapeHtml(team));

const server = http.createServer((req, res) => {
  let url;
  try {
    url = new URL(req.url, 'http://localhost');
  } catch {
    res.writeHead(400, { 'content-type': 'text/plain' });
    return res.end('bad request\n');
  }
  if (url.pathname === '/healthz' || url.pathname === '/readyz') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    return res.end('ok\n');
  }
  if (url.pathname === '/api/version') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ team, version }));
  }
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'content-type': types['.html'], 'cache-control': 'no-cache' });
    return res.end(indexHtml);
  }

  // Static files: resolve inside public/ only.
  let file;
  try {
    file = path.normalize(path.join(publicDir, decodeURIComponent(url.pathname)));
  } catch {
    file = '';
  }
  if (!file.startsWith(publicDir + path.sep)) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    return res.end('not found\n');
  }
  fs.readFile(file, (err, body) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      return res.end('not found\n');
    }
    res.writeHead(200, {
      'content-type': types[path.extname(file)] || 'application/octet-stream',
      'cache-control': 'public, max-age=300',
    });
    res.end(body);
  });
});

server.listen(port, () => console.log(`listening on :${port}, version ${version}`));

// Exit cleanly when Kubernetes stops the pod, so rollouts don't drop requests.
process.on('SIGTERM', () => server.close(() => process.exit(0)));
