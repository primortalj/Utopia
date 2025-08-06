/**
 * UT-IP (Utopia IP) Encoder
 * Visual IP address obfuscation system for enhanced network privacy
 * 
 * Features:
 * - Converts numeric IP addresses to Unicode symbols
 * - Reversible encoding/decoding
 * - Multiple security levels
 * - Integration with UNS resolver
 */

class UTIPEncoder {
  constructor(options = {}) {
    // Default symbol mapping (can be customized)
    this.symbolMap = options.symbolMap || {
      '0': '⊡',  // Empty square
      '1': '⊠',  // Filled square with X
      '2': '⊟',  // Square with horizontal line
      '3': '⌐',  // Right angle
      '4': '⊞',  // Square with plus
      '5': '⊛',  // Six pointed star
      '6': '⊜',  // Square with dot
      '7': '⊝',  // Square with minus
      '8': '⊚',  // Circled dot
      '9': '⊙',  // Circle with dot
      '.': '⌐',  // Period separator (right angle)
      ':': '◊'   // Port separator (diamond)
    };
    
    // Reverse mapping for decoding
    this.reverseMap = {};
    Object.entries(this.symbolMap).forEach(([key, value]) => {
      this.reverseMap[value] = key;
    });
    
    this.securityLevel = options.securityLevel || 1;
    this.rotationKey = options.rotationKey || 0;
  }

  /**
   * Encode an IP address to UT-IP format
   * @param {string} ipAddress - Standard IP address (e.g., "192.168.1.1")
   * @returns {string} UT-IP encoded address
   */
  encode(ipAddress) {
    if (!this.isValidIP(ipAddress)) {
      throw new Error('Invalid IP address format');
    }

    let encoded = ipAddress.split('').map(char => {
      return this.symbolMap[char] || char;
    }).join('');

    // Apply security level transformations
    switch (this.securityLevel) {
      case 1:
        return encoded;
      case 2:
        return this.applyRotation(encoded);
      case 3:
        return this.applyCryptographicObfuscation(encoded);
      default:
        return encoded;
    }
  }

  /**
   * Decode a UT-IP address back to standard IP format
   * @param {string} utipAddress - UT-IP encoded address
   * @returns {string} Standard IP address
   */
  decode(utipAddress) {
    let decoded = utipAddress;

    // Reverse security level transformations
    switch (this.securityLevel) {
      case 2:
        decoded = this.reverseRotation(decoded);
        break;
      case 3:
        decoded = this.reverseCryptographicObfuscation(decoded);
        break;
    }

    // Convert symbols back to numbers
    decoded = decoded.split('').map(char => {
      return this.reverseMap[char] || char;
    }).join('');

    if (!this.isValidIP(decoded)) {
      throw new Error('Invalid UT-IP address - cannot decode');
    }

    return decoded;
  }

  /**
   * Encode multiple IP addresses in a text string
   * @param {string} text - Text containing IP addresses
   * @returns {string} Text with IPs encoded as UT-IP
   */
  encodeInText(text) {
    const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
    return text.replace(ipRegex, (match) => {
      try {
        return this.encode(match);
      } catch (error) {
        return match; // Return original if encoding fails
      }
    });
  }

  /**
   * Decode UT-IP addresses in a text string
   * @param {string} text - Text containing UT-IP addresses
   * @returns {string} Text with UT-IPs decoded to standard IPs
   */
  decodeInText(text) {
    // Create regex pattern from symbol map values
    const symbolPattern = Object.values(this.symbolMap).map(s => 
      s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    ).join('|');
    
    const utipRegex = new RegExp(`[${symbolPattern}]+`, 'g');
    
    return text.replace(utipRegex, (match) => {
      try {
        return this.decode(match);
      } catch (error) {
        return match; // Return original if decoding fails
      }
    });
  }

  /**
   * Apply character rotation for security level 2
   * @param {string} encoded - Level 1 encoded string
   * @returns {string} Rotated encoded string
   */
  applyRotation(encoded) {
    const symbols = Object.values(this.symbolMap);
    return encoded.split('').map(char => {
      const index = symbols.indexOf(char);
      if (index !== -1) {
        const rotatedIndex = (index + this.rotationKey) % symbols.length;
        return symbols[rotatedIndex];
      }
      return char;
    }).join('');
  }

  /**
   * Reverse character rotation
   * @param {string} rotated - Rotated encoded string
   * @returns {string} Original encoded string
   */
  reverseRotation(rotated) {
    const symbols = Object.values(this.symbolMap);
    return rotated.split('').map(char => {
      const index = symbols.indexOf(char);
      if (index !== -1) {
        const originalIndex = (index - this.rotationKey + symbols.length) % symbols.length;
        return symbols[originalIndex];
      }
      return char;
    }).join('');
  }

  /**
   * Apply cryptographic obfuscation for security level 3
   * @param {string} encoded - Encoded string
   * @returns {string} Cryptographically obfuscated string
   */
  applyCryptographicObfuscation(encoded) {
    // Simple XOR-based obfuscation (can be enhanced with real crypto)
    const key = 'UTOPIA';
    return encoded.split('').map((char, index) => {
      const keyChar = key[index % key.length];
      const xored = char.charCodeAt(0) ^ keyChar.charCodeAt(0);
      return String.fromCharCode(xored);
    }).join('');
  }

  /**
   * Reverse cryptographic obfuscation
   * @param {string} obfuscated - Obfuscated string
   * @returns {string} Original encoded string
   */
  reverseCryptographicObfuscation(obfuscated) {
    // Reverse XOR (XOR is its own inverse)
    return this.applyCryptographicObfuscation(obfuscated);
  }

  /**
   * Validate IP address format
   * @param {string} ip - IP address to validate
   * @returns {boolean} True if valid IP format
   */
  isValidIP(ip) {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  /**
   * Generate a visual comparison of encoded vs decoded
   * @param {string} ipAddress - IP address to demonstrate
   * @returns {object} Comparison object
   */
  demonstrateEncoding(ipAddress) {
    const encoded = this.encode(ipAddress);
    return {
      original: ipAddress,
      encoded: encoded,
      decoded: this.decode(encoded),
      securityLevel: this.securityLevel,
      symbolMapping: this.getUsedSymbols(ipAddress)
    };
  }

  /**
   * Get symbol mapping for characters in an IP
   * @param {string} ipAddress - IP address
   * @returns {object} Mapping of characters to symbols
   */
  getUsedSymbols(ipAddress) {
    const uniqueChars = [...new Set(ipAddress.split(''))];
    const mapping = {};
    uniqueChars.forEach(char => {
      if (this.symbolMap[char]) {
        mapping[char] = this.symbolMap[char];
      }
    });
    return mapping;
  }

  /**
   * Create a custom symbol mapping
   * @param {object} customMap - Custom symbol mapping
   */
  setCustomMapping(customMap) {
    this.symbolMap = { ...this.symbolMap, ...customMap };
    
    // Rebuild reverse mapping
    this.reverseMap = {};
    Object.entries(this.symbolMap).forEach(([key, value]) => {
      this.reverseMap[value] = key;
    });
  }

  /**
   * Generate random symbol mapping for enhanced security
   */
  generateRandomMapping() {
    const symbols = ['⊡', '⊠', '⊟', '⌐', '⊞', '⊛', '⊜', '⊝', '⊚', '⊙', '◊', '◈', '◇', '◆', '▲', '▼', '◀', '▶', '♦', '♣', '♠', '♥'];
    const shuffled = [...symbols].sort(() => Math.random() - 0.5);
    
    const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', ':'];
    const newMapping = {};
    
    digits.forEach((digit, index) => {
      newMapping[digit] = shuffled[index % shuffled.length];
    });
    
    this.setCustomMapping(newMapping);
    return newMapping;
  }

  /**
   * Export current configuration
   * @returns {object} Configuration object
   */
  exportConfig() {
    return {
      symbolMap: this.symbolMap,
      securityLevel: this.securityLevel,
      rotationKey: this.rotationKey,
      version: '1.0.0'
    };
  }

  /**
   * Import configuration
   * @param {object} config - Configuration object
   */
  importConfig(config) {
    if (config.symbolMap) this.setCustomMapping(config.symbolMap);
    if (config.securityLevel) this.securityLevel = config.securityLevel;
    if (config.rotationKey) this.rotationKey = config.rotationKey;
  }
}

// UNS Integration
class UNSUTIPIntegration {
  constructor(unsResolver, utipEncoder) {
    this.uns = unsResolver;
    this.utip = utipEncoder;
  }

  /**
   * Resolve UNS address and return UT-IP encoded result
   * @param {string} unsAddress - UNS address
   * @returns {Promise<object>} Resolution result with UT-IP encoding
   */
  async resolveWithUTIP(unsAddress) {
    try {
      const resolved = await this.uns.resolve(unsAddress);
      
      return {
        original: {
          unsAddress: unsAddress,
          resolvedURL: resolved
        },
        encoded: {
          unsAddress: unsAddress,
          resolvedURL: this.utip.encodeInText(resolved)
        },
        utipDemo: this.extractAndEncodeIPs(resolved)
      };
    } catch (error) {
      throw new Error(`UNS resolution failed: ${error.message}`);
    }
  }

  /**
   * Extract IPs from resolved URL and show UT-IP encoding
   * @param {string} url - Resolved URL
   * @returns {array} Array of IP encoding demonstrations
   */
  extractAndEncodeIPs(url) {
    const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
    const matches = url.match(ipRegex) || [];
    
    return matches.map(ip => this.utip.demonstrateEncoding(ip));
  }
}

// Example usage and testing
function demonstrateUTIP() {
  console.log('🌍 UT-IP (Utopia IP) Encoder Demo\n');
  
  const encoder = new UTIPEncoder({ securityLevel: 1 });
  
  // Test various IP addresses
  const testIPs = [
    '192.168.1.1',
    '10.0.0.1', 
    '172.16.0.1',
    '8.8.8.8',
    '127.0.0.1'
  ];
  
  testIPs.forEach(ip => {
    const demo = encoder.demonstrateEncoding(ip);
    console.log(`Original: ${demo.original}`);
    console.log(`UT-IP:    ${demo.encoded}`);
    console.log(`Decoded:  ${demo.decoded}`);
    console.log(`Symbols:  ${JSON.stringify(demo.symbolMapping)}`);
    console.log('---');
  });
  
  // Test text encoding
  const sampleText = "Connect to 192.168.1.1:8080 or try 10.0.0.1 as backup.";
  console.log('\n📝 Text Encoding Demo:');
  console.log(`Original: ${sampleText}`);
  console.log(`UT-IP:    ${encoder.encodeInText(sampleText)}`);
  
  // Test security levels
  console.log('\n🔒 Security Level Demo:');
  const level2Encoder = new UTIPEncoder({ securityLevel: 2, rotationKey: 3 });
  const level3Encoder = new UTIPEncoder({ securityLevel: 3 });
  
  const testIP = '192.168.1.1';
  console.log(`Level 1: ${encoder.encode(testIP)}`);
  console.log(`Level 2: ${level2Encoder.encode(testIP)}`);
  console.log(`Level 3: ${level3Encoder.encode(testIP)}`);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UTIPEncoder, UNSUTIPIntegration };
} else if (typeof window !== 'undefined') {
  window.UTIP = { UTIPEncoder, UNSUTIPIntegration };
}

// Run demo if called directly
if (typeof require !== 'undefined' && require.main === module) {
  demonstrateUTIP();
}
