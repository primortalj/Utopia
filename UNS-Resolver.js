/**
 * Utopia Naming System (UNS) Resolver
 * Proof-of-concept implementation with UT-IP encoding support
 */

const { UTIPEncoder } = require('./UT-IP-Encoder.js');

class UNSResolver {
  constructor(options = {}) {
    const registryEndpoint =
      typeof options.registryEndpoint === 'string'
        ? options.registryEndpoint.trim()
        : (process.env.UNS_REGISTRY_URL || '').trim();

    if (registryEndpoint) {
      this.registries = [new HTTPRegistry(registryEndpoint)];
    } else {
      this.registries = [
        new HTTPRegistry('https://registry.utopia.network'),
        new DHTRegistry(),
        new IPFSRegistry(),
        new DNSRegistry()
      ];
    }

    this.cache = new Map();
    this.cacheTTL = options.cacheTTL || 3600; // 1 hour default

    this.utipEncoder = new UTIPEncoder({
      securityLevel: options.utipSecurityLevel || 1,
      rotationKey: options.utipRotationKey || 0
    });
    this.utipEnabled = options.utipEnabled !== false; // Default enabled
  }

  parseAddress(address) {
    const regex = /^utopia\.([a-z0-9\-]+)\/\/(.*)$/i;
    const match = address.match(regex);

    if (!match) {
      throw new Error(`Invalid UNS address format: ${address}`);
    }

    const [, network, path, ...rest] = match;

    if (network.length < 3 || network.length > 63) {
      throw new Error(`Invalid network name length: ${network}`);
    }

    if (network.startsWith('-') || network.endsWith('-')) {
      throw new Error(`Invalid network name format: ${network}`);
    }

    const pathParts = this.parsePath(path);

    return {
      protocol: 'utopia',
      network: network.toLowerCase(),
      path,
      ...pathParts
    };
  }

  parsePath(path) {
    let subdomain = null;
    let resourcePath = '';
    let query = '';
    let fragment = '';

    const fragmentIndex = path.indexOf('#');
    if (fragmentIndex !== -1) {
      fragment = path.substring(fragmentIndex + 1);
      path = path.substring(0, fragmentIndex);
    }

    const queryIndex = path.indexOf('?');
    if (queryIndex !== -1) {
      query = path.substring(queryIndex + 1);
      path = path.substring(0, queryIndex);
    }

    if (path.startsWith('.')) {
      const slashIndex = path.indexOf('/');
      if (slashIndex === -1) {
        subdomain = path;
      } else {
        subdomain = path.substring(0, slashIndex);
        resourcePath = path.substring(slashIndex);
      }
    } else {
      resourcePath = path.startsWith('/') ? path : '/' + path;
    }

    return {
      subdomain,
      resourcePath,
      query,
      fragment
    };
  }

  async resolve(address) {
    const cacheKey = address.toLowerCase();

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL * 1000) {
      return cached.url;
    }

    try {
      const parsed = this.parseAddress(address);
      const networkInfo = await this.lookupNetwork(parsed.network);

      if (!networkInfo) {
        throw new Error(`Network not found: ${parsed.network}`);
      }

      const resolvedURL = await this.resolveResource(networkInfo, parsed);
      this.cache.set(cacheKey, {
        url: resolvedURL,
        timestamp: Date.now()
      });

      return resolvedURL;
    } catch (error) {
      console.error(`Failed to resolve UNS address ${address}:`, error);
      throw error;
    }
  }

  async lookupNetwork(network) {
    const errors = [];
    for (const registry of this.registries) {
      try {
        const networkInfo = await registry.lookup(network);
        if (networkInfo) return networkInfo;
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length) {
      console.warn(
        `Registry lookup failed for ${network}: ${errors
          .map((e) => e.message)
          .join(' | ')}`
      );
    }

    return null;
  }

  async resolveResource(networkInfo, parsed) {
    const resolvers = Array.isArray(networkInfo.resolvers)
      ? networkInfo.resolvers
      : [networkInfo.resolvers].filter(Boolean);

    for (const resolverURL of resolvers) {
      try {
        if (resolverURL.startsWith('http')) {
          return await this.httpResolve(resolverURL, parsed);
        } else if (resolverURL.startsWith('ipfs://')) {
          return await this.ipfsResolve(resolverURL, parsed);
        } else {
          return this.directResolve(networkInfo, parsed);
        }
      } catch (error) {
        console.warn(`Resolver failed: ${resolverURL}`, error);
        continue;
      }
    }

    throw new Error(`All resolvers failed for network: ${parsed.network}`);
  }

  async httpResolve(resolverURL, parsed) {
    const url = new URL('/resolve', resolverURL);
    url.searchParams.set('network', parsed.network);
    url.searchParams.set('path', parsed.path);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`HTTP resolver error: ${response.status}`);
    }

    const result = await response.json();
    return result.url;
  }

  async ipfsResolve(resolverURL, parsed) {
    // Implementation would interact with IPFS network
    throw new Error('IPFS resolution not implemented yet');
  }

  directResolve(networkInfo, parsed) {
    if (parsed.subdomain && networkInfo.subdomains) {
      const baseURL = networkInfo.subdomains[parsed.subdomain];
      if (baseURL) {
        let resolvedURL = baseURL;
        if (parsed.resourcePath && parsed.resourcePath !== '/') {
          resolvedURL += parsed.resourcePath;
        }
        if (parsed.query) {
          resolvedURL += '?' + parsed.query;
        }
        if (parsed.fragment) {
          resolvedURL += '#' + parsed.fragment;
        }
        return resolvedURL;
      }
    }

    if (networkInfo.defaultURL) {
      return networkInfo.defaultURL + '/' + parsed.path;
    }

    throw new Error(`No resolver found for path: ${parsed.path}`);
  }

  async resolveWithUTIP(address, includeUTIP = true) {
    try {
      const resolvedURL = await this.resolve(address);

      const result = {
        unsAddress: address,
        resolvedURL,
        timestamp: new Date().toISOString()
      };

      if (includeUTIP && this.utipEnabled) {
        result.utip = {
          encodedURL: this.utipEncoder.encodeInText(resolvedURL),
          securityLevel: this.utipEncoder.securityLevel,
          ipMappings: this.extractAndEncodeIPs(resolvedURL)
        };
      }

      return result;
    } catch (error) {
      throw new Error(`UNS resolution with UT-IP failed: ${error.message}`);
    }
  }

  extractAndEncodeIPs(url) {
    const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
    const matches = url.match(ipRegex) || [];

    return matches.map((ip) => ({
      original: ip,
      encoded: this.utipEncoder.encode(ip),
      symbolMapping: this.utipEncoder.getUsedSymbols(ip)
    }));
  }

  setUTIPEnabled(enabled) {
    this.utipEnabled = enabled;
  }

  configureUTIP(options) {
    if (options.securityLevel !== undefined) {
      this.utipEncoder.securityLevel = options.securityLevel;
    }
    if (options.rotationKey !== undefined) {
      this.utipEncoder.rotationKey = options.rotationKey;
    }
    if (options.customMapping) {
      this.utipEncoder.setCustomMapping(options.customMapping);
    }
  }

  getUTIPConfig() {
    return {
      enabled: this.utipEnabled,
      ...this.utipEncoder.exportConfig()
    };
  }

  demonstrateUTIP(ipAddress) {
    return this.utipEncoder.demonstrateEncoding(ipAddress);
  }

  clearCache() {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

class HTTPRegistry {
  constructor(baseURL) {
    this.baseURL = baseURL.replace(/\/+$/, '');
  }

  async lookup(network) {
    const url = `${this.baseURL}/lookup/${encodeURIComponent(network)}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP registry lookup failed: ${response.status}`);
    }

    return await response.json();
  }

  async register(network, networkInfo) {
    const response = await fetch(`${this.baseURL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(networkInfo)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP registry register failed: ${response.status}: ${text}`);
    }

    return await response.json();
  }

  async update(network, networkInfo) {
    return this.register(network, networkInfo);
  }
}

class DHTRegistry {
  constructor(options = {}) {
    this.dhtNodes = options.dhtNodes || [
      'dht.utopia.network',
      'bootstrap.uns.org'
    ];
  }

  async lookup(network) {
    const mockData = {
      'dillanet': {
        owner: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
        resolvers: ['mock://direct-resolution'],
        subdomains: {
          '.obsidiannotes': 'https://notes.dillanet.org',
          '.nextcloud': 'https://cloud.dillanet.org',
          '.git': 'https://git.dillanet.org'
        },
        signature: 'mock-signature',
        timestamp: '2024-08-06T13:00:00Z'
      },
      'alice': {
        owner: 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        resolvers: ['mock://direct-resolution'],
        subdomains: {
          '.blog': 'https://alice.blog',
          '.photos': 'https://photos.alice.cloud'
        }
      }
    };

    return mockData[network] || null;
  }

  async register(network, networkInfo) {
    console.log(`Registering network ${network} in DHT`);
    return true;
  }
}

class IPFSRegistry {
  async lookup(network) {
    return null;
  }
}

class DNSRegistry {
  async lookup(network) {
    try {
      const dnsName = `_uns.${network}.utopia`;
      // TODO: replace with real DNS TXT lookup
      return null;
    } catch (error) {
      return null;
    }
  }
}

class UNSBrowserExtension {
  constructor() {
    this.resolver = new UNSResolver();
    this.setupWebRequestInterceptor();
  }

  setupWebRequestInterceptor() {
    if (typeof chrome !== 'undefined' && chrome.webRequest) {
      chrome.webRequest.onBeforeRequest.addListener(
        this.handleRequest.bind(this),
        { urls: ["*://utopia.*/*"] },
        ["blocking"]
      );
    }
  }

  async handleRequest(details) {
    try {
      const originalUrl = new URL(details.url);
      const unsAddress = `utopia.${originalUrl.hostname.replace(/^utopia./, '')}${originalUrl.pathname}${originalUrl.search}${originalUrl.hash}`;
      const resolvedUrl = await this.resolver.resolve(unsAddress);
      return { redirectUrl: resolvedUrl };
    } catch (error) {
      console.error('UNS resolution failed:', error);
      return {};
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    UNSResolver,
    DHTRegistry,
    IPFSRegistry,
    DNSRegistry,
    HTTPRegistry,
    UNSBrowserExtension
  };
} else if (typeof window !== 'undefined') {
  window.UNS = {
    UNSResolver,
    DHTRegistry,
    IPFSRegistry,
    DNSRegistry,
    HTTPRegistry,
    UNSBrowserExtension
  };
}
