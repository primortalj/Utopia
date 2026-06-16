#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const STORE_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.uns', 'networks.json');

function readStore() {
  if (!fs.existsSync(STORE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeStore(data) {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'POST' && req.url === '/register') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      const name = typeof data.network === 'string' ? data.network.trim().toLowerCase() : '';
      if (!name) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Missing network' }));
        return;
      }

      const store = readStore();
      if (store[name]) {
        res.statusCode = 409;
        res.end(JSON.stringify({ error: 'Network already exists' }));
        return;
      }

      store[name] = {
        network: name,
        owner: data.owner || null,
        resolvers: Array.isArray(data.resolvers) ? data.resolvers : [],
        subdomains: typeof data.subdomains === 'object' ? data.subdomains : {},
        signature: data.signature || null,
        created: new Date().toISOString()
      };

      writeStore(store);
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, network: name }));
    });
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/lookup/')) {
    const name = decodeURIComponent(req.url.split('/lookup/')[1].split('?')[0]).trim().toLowerCase();
    const store = readStore();
    const record = store[name] || null;

    res.statusCode = record ? 200 : 404;
    res.end(JSON.stringify(record || { error: 'Network not found' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/resolve') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      const network = (data.network || '').trim().toLowerCase();
      const path = typeof data.path === 'string' ? data.path : '';

      const store = readStore();
      const record = store[network];
      if (!record) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
      }

      // TODO: stricter path parsing
      const base = record.subdomains ? record.subdomains[path] : null;
      if (base) {
        res.statusCode = 200;
        res.end(JSON.stringify({ url: base }));
        return;
      }

      // Best-effort subst path match for exact-prefix matches
      let best = null;
      for (const [key, value] of Object.entries(record.subdomains || {})) {
        if (path.startsWith(key) && (!best || key.length > best.key.length)) {
          best = { key, value };
        }
      }

      if (best) {
        res.statusCode = 200;
        res.end(JSON.stringify({ url: best.value }));
        return;
      }

      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Resource not found' }));
    });
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`UNS registry server running on http://localhost:${PORT}`);
  console.log(`Store: ${STORE_PATH}`);
});
