# Utopia Naming System - Implementation Guide

## Quick Start

This guide provides practical steps to build and deploy the Utopia Naming System (UNS). Follow these instructions to set up a working prototype.

## Prerequisites

- Node.js 18+ 
- Git
- Modern web browser (Chrome/Firefox)
- Basic understanding of JavaScript and networking concepts

## Phase 1: Core Resolver Setup

### 1. Initialize Project

```bash
mkdir utopia-naming-system
cd utopia-naming-system
npm init -y
```

### 2. Install Dependencies

```bash
npm install express cors helmet ratelimit-header-parser
npm install --save-dev jest nodemon
```

### 3. Set Up Development Environment

Create `package.json` scripts:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "cli": "node uns-cli.js"
  }
}
```

### 4. Test the Resolver

```javascript
// test-resolver.js
const { UNSResolver } = require('./UNS-Resolver.js');

async function testResolver() {
  const resolver = new UNSResolver();
  
  try {
    // Test parsing
    const parsed = resolver.parseAddress('utopia.dillanet//.obsidiannotes');
    console.log('Parsed:', parsed);
    
    // Test resolution
    const resolved = await resolver.resolve('utopia.dillanet//.obsidiannotes');
    console.log('Resolved:', resolved);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testResolver();
```

Run the test:
```bash
node test-resolver.js
```

## Phase 2: Registry Implementation

### 1. Simple HTTP Registry Server

Create `registry-server.js`:

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory registry (use database in production)
const networks = new Map();

// Register network
app.post('/register', (req, res) => {
  const { network, owner, resolvers, signature } = req.body;
  
  if (networks.has(network)) {
    return res.status(409).json({ error: 'Network already exists' });
  }
  
  // Validate signature (implement proper validation)
  networks.set(network, {
    network,
    owner,
    resolvers,
    subdomains: {},
    signature,
    created: new Date().toISOString()
  });
  
  res.json({ success: true, network });
});

// Lookup network
app.get('/lookup/:network', (req, res) => {
  const network = networks.get(req.params.network);
  if (network) {
    res.json(network);
  } else {
    res.status(404).json({ error: 'Network not found' });
  }
});

// Resolve address
app.post('/resolve', async (req, res) => {
  const { network, path } = req.body;
  const networkInfo = networks.get(network);
  
  if (!networkInfo) {
    return res.status(404).json({ error: 'Network not found' });
  }
  
  // Simple subdomain resolution
  if (path.startsWith('.')) {
    const subdomain = path.split('/')[0];
    const baseURL = networkInfo.subdomains[subdomain];
    if (baseURL) {
      const remainingPath = path.substring(subdomain.length);
      return res.json({ url: baseURL + remainingPath });
    }
  }
  
  res.status(404).json({ error: 'Resource not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`UNS Registry running on port ${PORT}`);
});
```

Start the registry:
```bash
node registry-server.js
```

### 2. Test Network Registration

```bash
# Register a network
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{
    "network": "testnet",
    "owner": "did:key:test123",
    "resolvers": ["http://localhost:3000"],
    "signature": "mock-signature"
  }'

# Lookup network
curl http://localhost:3000/lookup/testnet
```

## Phase 3: Browser Extension

### 1. Create Extension Structure

```
browser-extension/
├── manifest.json
├── background.js
├── popup.html
├── popup.js
├── options.html
├── options.js
├── content.js
└── icons/
```

### 2. Load Extension in Chrome

1. Open Chrome → Extensions → Developer Mode
2. Click "Load unpacked"
3. Select the `browser-extension` folder
4. Test with addresses like `utopia.dillanet//.obsidiannotes`

### 3. Test Extension

Create test HTML:

```html
<!DOCTYPE html>
<html>
<head>
    <title>UNS Test Page</title>
</head>
<body>
    <h1>UNS Test Links</h1>
    <ul>
        <li><a href="utopia.dillanet//.obsidiannotes">Obsidian Notes</a></li>
        <li><a href="utopia.dillanet//.nextcloud">Nextcloud</a></li>
        <li><a href="utopia.alice//.blog">Alice's Blog</a></li>
    </ul>
</body>
</html>
```

## Phase 4: CLI Tool

### 1. Make CLI Executable

```bash
chmod +x uns-cli.js
```

### 2. Test CLI Commands

```bash
# Initialize identity
node uns-cli.js init

# Register network (mock)
node uns-cli.js register mynetwork https://myserver.com/uns

# Add subdomain
node uns-cli.js subdomain add mynetwork .webapp https://myapp.com

# List subdomains
node uns-cli.js subdomain list mynetwork

# Resolve address
node uns-cli.js resolve utopia.mynetwork//.webapp
```

## Phase 5: Advanced Features

### 1. Add DNS Integration

```javascript
// dns-resolver.js
const dns = require('dns').promises;

class DNSRegistry {
  async lookup(network) {
    try {
      const txtRecords = await dns.resolveTxt(`_uns.${network}.utopia`);
      if (txtRecords.length > 0) {
        return this.parseTxtRecord(txtRecords[0]);
      }
    } catch (error) {
      return null;
    }
  }
  
  parseTxtRecord(records) {
    // Parse DNS TXT record format
    // Example: "resolver=https://example.com/uns"
  }
}
```

### 2. Add IPFS Support

```bash
npm install ipfs-http-client
```

```javascript
// ipfs-registry.js
const { create } = require('ipfs-http-client');

class IPFSRegistry {
  constructor() {
    this.ipfs = create({ url: 'http://localhost:5001' });
  }
  
  async lookup(network) {
    try {
      const ipnsKey = `/ipns/${network}.uns`;
      const content = await this.ipfs.cat(ipnsKey);
      return JSON.parse(content.toString());
    } catch (error) {
      return null;
    }
  }
}
```

### 3. Add Caching Layer

```javascript
// cache-manager.js
const Redis = require('redis');

class CacheManager {
  constructor() {
    this.redis = Redis.createClient();
  }
  
  async get(key) {
    const value = await this.redis.get(`uns:${key}`);
    return value ? JSON.parse(value) : null;
  }
  
  async set(key, value, ttl = 3600) {
    await this.redis.setEx(`uns:${key}`, ttl, JSON.stringify(value));
  }
}
```

## Deployment Strategies

### 1. Local Development

```bash
# Start all services
npm run dev &           # Registry server
node uns-daemon.js &    # Local resolver daemon
```

### 2. Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t uns-registry .
docker run -p 3000:3000 uns-registry
```

### 3. Cloud Deployment

Deploy to platforms like:
- **Heroku**: Simple web app deployment
- **Vercel**: Serverless functions
- **AWS Lambda**: Scalable serverless
- **DigitalOcean Apps**: Container platform

Example Vercel deployment:
```bash
npm install -g vercel
vercel --prod
```

## Testing Strategy

### 1. Unit Tests

```javascript
// tests/resolver.test.js
const { UNSResolver } = require('../UNS-Resolver');

describe('UNS Resolver', () => {
  test('should parse valid UNS address', () => {
    const resolver = new UNSResolver();
    const result = resolver.parseAddress('utopia.test//.webapp');
    
    expect(result.network).toBe('test');
    expect(result.subdomain).toBe('.webapp');
  });
  
  test('should reject invalid address', () => {
    const resolver = new UNSResolver();
    expect(() => {
      resolver.parseAddress('invalid-address');
    }).toThrow();
  });
});
```

Run tests:
```bash
npm test
```

### 2. Integration Tests

```javascript
// tests/integration.test.js
const request = require('supertest');
const app = require('../registry-server');

describe('Registry API', () => {
  test('should register new network', async () => {
    const response = await request(app)
      .post('/register')
      .send({
        network: 'testnet',
        owner: 'did:test:123',
        resolvers: ['http://localhost:3000']
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### 3. End-to-End Tests

Use tools like Playwright or Selenium to test the browser extension:

```javascript
// tests/e2e.test.js
const { test, expect } = require('@playwright/test');

test('UNS resolution in browser', async ({ page }) => {
  await page.goto('utopia.dillanet//.obsidiannotes');
  await expect(page).toHaveURL(/notes\.dillanet\.org/);
});
```

## Performance Optimization

### 1. Caching Strategy

- **L1 Cache**: In-memory (resolver)
- **L2 Cache**: Redis (registry)
- **L3 Cache**: CDN (static content)

### 2. Load Balancing

```nginx
# nginx.conf
upstream uns_registry {
    server registry1:3000;
    server registry2:3000;
    server registry3:3000;
}

server {
    listen 80;
    server_name registry.utopia.network;
    
    location / {
        proxy_pass http://uns_registry;
        proxy_cache my_cache;
        proxy_cache_valid 200 1h;
    }
}
```

### 3. Monitoring

```javascript
// monitoring.js
const prometheus = require('prom-client');

const resolveCounter = new prometheus.Counter({
  name: 'uns_resolutions_total',
  help: 'Total number of UNS resolutions'
});

const resolveLatency = new prometheus.Histogram({
  name: 'uns_resolve_duration_seconds',
  help: 'UNS resolution latency'
});
```

## Security Considerations

### 1. Input Validation

```javascript
function validateNetworkName(network) {
  if (!/^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$/.test(network)) {
    throw new Error('Invalid network name');
  }
}

function sanitizePath(path) {
  // Remove dangerous characters
  return path.replace(/[<>:"|?*]/g, '');
}
```

### 2. Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/register', limiter);
```

### 3. HTTPS Enforcement

```javascript
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

## Troubleshooting

### Common Issues

1. **Resolution fails**: Check network connectivity and registry availability
2. **Extension not working**: Verify manifest permissions and reload extension
3. **DNS conflicts**: Ensure no conflicts with existing DNS entries
4. **Performance issues**: Check cache hit rates and optimize accordingly

### Debug Tools

```javascript
// debug-utils.js
function enableDebug() {
  localStorage.setItem('uns-debug', 'true');
}

function debugLog(...args) {
  if (localStorage.getItem('uns-debug')) {
    console.log('[UNS Debug]', ...args);
  }
}
```

### Health Checks

```javascript
// health-check.js
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };
  res.json(health);
});
```

## Next Steps

1. **Community Building**: Create documentation and tutorials
2. **Standards Development**: Work with W3C and IETF on standardization
3. **Security Audits**: Engage security experts for code review
4. **Performance Testing**: Load testing and optimization
5. **Mobile Support**: Develop mobile apps and SDKs
6. **Governance**: Establish community governance mechanisms

## Resources

- [Technical Specification](./UNS-Technical-Specification.md)
- [API Documentation](./UNS-API-Reference.md)
- [Community Forum](https://forum.utopia.network)
- [GitHub Repository](https://github.com/utopia-naming-system)
- [Discord Server](https://discord.gg/utopia-naming)

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit pull request

For detailed contribution guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md).
