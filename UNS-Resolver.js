/**
 * Utopia Naming System (UNS) Resolver
 * Proof-of-concept implementation
 */

class UNSResolver {
  constructor(options = {}) {
    this.registries = options.registries || [
      new DHTRegistry(),
      new IPFSRegistry(),
      new DNSRegistry()
    ];
    this.cache = new Map();
    this.cacheTTL = options.cacheTTL || 3600; // 1 hour default
  }

  /**
   * Parse UNS address into components
   * @param {string} address - UNS address (e.g., "utopia.dillanet//.obsidiannotes")
   * @returns {object} Parsed components
   */
  parseAddress(address) {
    const regex = /^utopia\.([a-z0-9\-]+)\/\/(.*)$/i;
    const match = address.match(regex);
    
    if (!match) {
      throw new Error(`Invalid UNS address format: ${address}`);
    }

    const [, network, path] = match;
    
    // Validate network name
    if (network.length < 3 || network.length > 63) {
      throw new Error(`Invalid network name length: ${network}`);
    }
    
    if (network.startsWith('-') || network.endsWith('-')) {
      throw new Error(`Invalid network name format: ${network}`);
    }

    // Parse path components
    const pathParts = this.parsePath(path);
    
    return {
      protocol: 'utopia',
      network: network.toLowerCase(),
      path: path,
      ...pathParts
    };
  }

  /**
   * Parse path component into subdomain, resource path, query, fragment
   * @param {string} path - Path component
   * @returns {object} Parsed path components
   */
  parsePath(path) {
    let subdomain = null;
    let resourcePath = '';
    let query = '';
    let fragment = '';

    // Extract fragment
    const fragmentIndex = path.indexOf('#');
    if (fragmentIndex !== -1) {
      fragment = path.substring(fragmentIndex + 1);
      path = path.substring(0, fragmentIndex);
    }

    // Extract query
    const queryIndex = path.indexOf('?');
    if (queryIndex !== -1) {
      query = path.substring(queryIndex + 1);
      path = path.substring(0, queryIndex);
    }

    // Check for subdomain (dot-prefixed)
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

  /**
   * Resolve UNS address to actual URL/resource
   * @param {string} address - UNS address
   * @returns {Promise<string>} Resolved URL
   */
  async resolve(address) {
    const cacheKey = address.toLowerCase();
    
    // Check cache first
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
      
      // Cache the result
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

  /**
   * Lookup network information from registries
   * @param {string} network - Network name
   * @returns {Promise<object>} Network information
   */
  async lookupNetwork(network) {
    for (const registry of this.registries) {
      try {
        const networkInfo = await registry.lookup(network);
        if (networkInfo) {
          return networkInfo;
        }
      } catch (error) {
        console.warn(`Registry lookup failed for ${network}:`, error);
        continue;
      }
    }
    return null;
  }

  /**
   * Resolve resource within network
   * @param {object} networkInfo - Network configuration
   * @param {object} parsed - Parsed UNS address
   * @returns {Promise<string>} Resolved URL
   */
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
          // Direct mapping
          return this.directResolve(networkInfo, parsed);
        }
      } catch (error) {
        console.warn(`Resolver failed: ${resolverURL}`, error);
        continue;
      }
    }

    throw new Error(`All resolvers failed for network: ${parsed.network}`);
  }

  /**
   * Resolve via HTTP resolver
   * @param {string} resolverURL - HTTP resolver endpoint
   * @param {object} parsed - Parsed UNS address
   * @returns {Promise<string>} Resolved URL
   */
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

  /**
   * Resolve via IPFS
   * @param {string} resolverURL - IPFS resolver
   * @param {object} parsed - Parsed UNS address
   * @returns {Promise<string>} Resolved URL
   */
  async ipfsResolve(resolverURL, parsed) {
    // Implementation would interact with IPFS network
    throw new Error('IPFS resolution not implemented yet');
  }

  /**
   * Direct resolution using subdomain mapping
   * @param {object} networkInfo - Network configuration
   * @param {object} parsed - Parsed UNS address
   * @returns {string} Resolved URL
   */
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

    // Fallback to default resolver if available
    if (networkInfo.defaultURL) {
      return networkInfo.defaultURL + '/' + parsed.path;
    }

    throw new Error(`No resolver found for path: ${parsed.path}`);
  }

  /**
   * Clear resolver cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {object} Cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

/**
 * DHT-based registry implementation
 */
class DHTRegistry {
  constructor(options = {}) {
    this.dhtNodes = options.dhtNodes || [
      'dht.utopia.network',
      'bootstrap.uns.org'
    ];
  }

  async lookup(network) {
    // Mock implementation - would connect to DHT network
    const mockData = {
      'dillanet': {
        owner: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
        resolvers: ['https://dillanet.org/uns'],
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
        resolvers: ['https://alice.personal.cloud/uns'],
        subdomains: {
          '.blog': 'https://alice.blog',
          '.photos': 'https://photos.alice.cloud'
        }
      }
    };

    return mockData[network] || null;
  }

  async register(network, networkInfo) {
    // Mock implementation
    console.log(`Registering network ${network} in DHT`);
    return true;
  }
}

/**
 * IPFS-based registry implementation
 */
class IPFSRegistry {
  async lookup(network) {
    // Mock implementation - would use IPNS resolution
    return null;
  }
}

/**
 * DNS-based registry fallback
 */
class DNSRegistry {
  async lookup(network) {
    try {
      // Query DNS TXT record for _uns.{network}.utopia
      const dnsName = `_uns.${network}.utopia`;
      // Mock implementation - would perform actual DNS lookup
      return null;
    } catch (error) {
      return null;
    }
  }
}

/**
 * Browser extension helper
 */
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
      const unsAddress = `utopia.${originalUrl.hostname.substring(7)}${originalUrl.pathname}${originalUrl.search}${originalUrl.hash}`;
      
      const resolvedUrl = await this.resolver.resolve(unsAddress);
      
      return { redirectUrl: resolvedUrl };
    } catch (error) {
      console.error('UNS resolution failed:', error);
      return {};
    }
  }
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    UNSResolver,
    DHTRegistry,
    IPFSRegistry,
    DNSRegistry,
    UNSBrowserExtension
  };
} else if (typeof window !== 'undefined') {
  window.UNS = {
    UNSResolver,
    DHTRegistry,
    IPFSRegistry,
    DNSRegistry,
    UNSBrowserExtension
  };
}
