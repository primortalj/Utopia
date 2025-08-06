# 🌍 Utopia Naming System (UNS)

> A decentralized, free naming protocol that provides human-readable addressing for distributed resources.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2018.0.0-brightgreen)](https://nodejs.org/)
[![Status: Prototype](https://img.shields.io/badge/status-prototype-orange)](https://github.com/primortalj/Utopia)

## 🚀 Quick Start

The Utopia Naming System enables addresses like:
- `utopia.dillanet//.obsidiannotes` → `https://notes.dillanet.org`
- `utopia.alice//.blog` → `https://alice.blog`
- `utopia.opensrc//.git/main` → `https://git.opensrc.dev/main`

### Address Format
```
utopia.<network>//<path>
```

Where:
- `utopia` = Global root identifier
- `<network>` = Community/personal namespace (3-63 chars, alphanumeric + hyphens)
- `//` = Protocol delimiter
- `<path>` = Resource path (subdomains, files, etc.)

## 🎯 Design Principles

- **🆓 Fully Free**: No fees, bidding, or auctions for namespace registration
- **🌐 Decentralized**: No central authority controls namespace allocation
- **👥 Human-Readable**: Intuitive addressing scheme similar to traditional URLs
- **🔧 Extensible**: Support for HTTP/HTTPS, IPFS, P2P, and custom protocols
- **🔒 Self-Sovereign**: Users control their own namespaces and subdomains

## 📦 Components

### Core Implementation
- **[UNS-Resolver.js](./UNS-Resolver.js)** - JavaScript resolver with multi-registry support
- **[uns-cli.js](./uns-cli.js)** - Command-line tool for network management
- **[Browser Extension](./browser-extension/)** - Chrome/Firefox extension for automatic resolution

### Documentation
- **[Technical Specification](./UNS-Technical-Specification.md)** - Complete protocol specification
- **[Implementation Guide](./UNS-Implementation-Guide.md)** - Step-by-step build instructions

## 🛠️ Installation & Usage

### 1. Clone the Repository
```bash
git clone https://github.com/primortalj/Utopia.git
cd Utopia
npm install
```

### 2. Test the Resolver
```bash
node -e "
const { UNSResolver } = require('./UNS-Resolver.js');
const resolver = new UNSResolver();
resolver.resolve('utopia.dillanet//.obsidiannotes')
  .then(url => console.log('Resolved:', url))
  .catch(err => console.error('Error:', err.message));
"
```

### 3. Initialize CLI Identity
```bash
node uns-cli.js init
```

### 4. Register Your Network
```bash
node uns-cli.js register mynetwork https://myserver.com/uns
node uns-cli.js subdomain add mynetwork .webapp https://myapp.com
```

### 5. Install Browser Extension
1. Open Chrome → Extensions → Developer Mode
2. Click "Load unpacked"
3. Select the `browser-extension` folder
4. Test with `utopia.dillanet//.obsidiannotes`

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │    │   UNS Resolver  │    │ Registry Network│
│                 │    │                 │    │                 │
│ • Browsers      │◄──►│ • Local Daemon  │◄──►│ • DHT Storage   │
│ • Mobile Apps   │    │ • DNS Plugin    │    │ • Blockchain    │
│ • CLI Tools     │    │ • Browser Ext   │    │ • IPFS/IPNS     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Registry Options

The system supports multiple decentralized registry implementations:

- **🌐 Distributed Hash Table (DHT)**: Peer-to-peer network storage
- **🔗 Blockchain**: Ethereum smart contracts for ownership
- **📡 IPFS/IPNS**: Content-addressed storage
- **🌍 DNS Fallback**: TXT records for compatibility

## 🎨 Examples

### JavaScript API
```javascript
const { UNSResolver } = require('./UNS-Resolver.js');
const resolver = new UNSResolver();

// Resolve address
const url = await resolver.resolve('utopia.alice//.photos');
console.log(url); // → https://photos.alice.cloud
```

### CLI Usage
```bash
# Register network
uns register myproject https://myproject.org/uns

# Add subdomain
uns subdomain add myproject .docs https://docs.myproject.org
uns subdomain add myproject .api https://api.myproject.org

# List subdomains
uns subdomain list myproject

# Resolve address
uns resolve utopia.myproject//.docs
```

### Browser Extension
The extension automatically intercepts and resolves `utopia.*` URLs in your browser, redirecting them to their actual destinations.

## 🛡️ Security Features

- **🔐 Cryptographic Ownership**: Ed25519 key pairs for network ownership
- **✍️ Digital Signatures**: All registry updates must be signed by owner
- **⏰ Timestamp Validation**: Prevents replay attacks
- **🚫 Input Validation**: Strict network name and path validation
- **🛡️ Rate Limiting**: Protection against spam and abuse

## 🚧 Development Status

This is currently a **prototype implementation** demonstrating the core concepts. The system includes:

✅ **Working resolver** with address parsing and resolution
✅ **CLI tools** for network and subdomain management  
✅ **Browser extension** for automatic URL interception
✅ **Multiple registry backends** (mock implementations)
✅ **Comprehensive documentation** and specifications

### Roadmap

- [ ] **Phase 1**: Production DHT registry implementation
- [ ] **Phase 2**: Security audit and hardening
- [ ] **Phase 3**: Mobile SDKs and apps
- [ ] **Phase 4**: Community governance tools
- [ ] **Phase 5**: Protocol standardization (W3C/IETF)

## 🤝 Contributing

We welcome contributions! Please see our [Implementation Guide](./UNS-Implementation-Guide.md) for development setup.

### Ways to Contribute
- 🐛 Report bugs and issues
- 💡 Suggest new features
- 📖 Improve documentation
- 🔧 Submit code improvements
- 🧪 Write tests
- 🎨 Design UI/UX improvements

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Vision

The Utopia Naming System represents a paradigm shift toward decentralized, user-controlled internet addressing. By combining familiar URL-like syntax with decentralized registry mechanisms, UNS provides a foundation for a more open and democratic internet infrastructure.

**Join us in building the decentralized web of the future!**

## 📞 Contact & Community

- 📧 **Email**: [Your contact email]
- 💬 **Discussions**: [GitHub Discussions](https://github.com/primortalj/Utopia/discussions)
- 🐛 **Issues**: [GitHub Issues](https://github.com/primortalj/Utopia/issues)
- 📋 **Project Board**: [GitHub Projects](https://github.com/primortalj/Utopia/projects)

---

<div align="center">
  <p><strong>🌍 Building a decentralized, free, and open internet for everyone 🌍</strong></p>
</div>
