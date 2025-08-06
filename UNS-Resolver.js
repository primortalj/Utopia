/**
 * Utopia Naming System (UNS) Resolver
 * Proof-of-concept implementation with UT-IP encoding support
 */

// Import UT-IP Encoder
const { UTIPEncoder } = require('./UT-IP-Encoder.js');

class UNSResolver {
  constructor(options = {}) {
    this.registries = options.registries || [
      new DHTRegistry(),
      new IPFSRegistry(),
      new DNSRegistry()
    ];
    this.cache = new Map();
    this.cacheTTL = options.cacheTTL || 3600; // 1 hour default
    
    // Initialize UT-IP encoder
    this.utipEncoder = new UTIPEncoder({
      securityLevel: options.utipSecurityLevel || 1,
      rotationKey: options.utipRotationKey || 0
    });
    this.utipEnabled = options.utipEnabled !== false; // Default enabled
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
   * Resolve UNS address and return result with UT-IP encoding
   * @param {string} address - UNS address
   * @param {boolean} includeUTIP - Whether to include UT-IP encoding
   * @returns {Promise<object>} Resolution result with optional UT-IP encoding
   */
  async resolveWithUTIP(address, includeUTIP = true) {
    try {
      const resolvedURL = await this.resolve(address);
      
      const result = {
        unsAddress: address,
        resolvedURL: resolvedURL,
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
  
  /**
   * Extract IP addresses from URL and show UT-IP encoding
   * @param {string} url - URL to process
   * @returns {array} Array of IP encoding demonstrations
   */
  extractAndEncodeIPs(url) {
    const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
    const matches = url.match(ipRegex) || [];
    
    return matches.map(ip => {
      return {
        original: ip,
        encoded: this.utipEncoder.encode(ip),
        symbolMapping: this.utipEncoder.getUsedSymbols(ip)
      };
    });
  }
  
  /**
   * Enable/disable UT-IP encoding
   * @param {boolean} enabled - Whether UT-IP should be enabled
   */
  setUTIPEnabled(enabled) {
    this.utipEnabled = enabled;
  }
  
  /**
   * Configure UT-IP encoder settings
   * @param {object} options - UT-IP configuration options
   */
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
  
  /**
   * Get UT-IP encoder configuration
   * @returns {object} Current UT-IP configuration
   */
  getUTIPConfig() {
    return {
      enabled: this.utipEnabled,
      ...this.utipEncoder.exportConfig()
    };
  }
  
  /**
   * Demonstrate UT-IP encoding for a given IP
   * @param {string} ipAddress - IP address to encode
   * @returns {object} UT-IP demonstration
   */
  demonstrateUTIP(ipAddress) {
    return this.utipEncoder.demonstrateEncoding(ipAddress);
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
    // Mock implementation - returns direct subdomain mapping for demo
    const mockData = {
      'dillanet': {
        owner: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
        resolvers: ['mock://direct-resolution'], // Use mock resolver for demo
        subdomains: {
          '.obsidiannotes': 'https://192.168.1.50:8080/notes',
          '.nextcloud': 'https://10.0.0.100:9000/cloud', 
          '.git': 'https://172.16.0.10:3000/git'
        },
        signature: 'mock-signature',
        timestamp: '2024-08-06T13:00:00Z'
      },
      'alice': {
        owner: 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        resolvers: ['mock://direct-resolution'],
        subdomains: {
          '.blog': 'https://192.168.0.20:4000/blog',
          '.photos': 'https://10.0.1.30:5000/gallery'
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
