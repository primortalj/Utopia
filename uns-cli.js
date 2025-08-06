#!/usr/bin/env node

/**
 * UNS CLI Tool
 * Command-line interface for Utopia Naming System management
 */

const { UNSResolver, DHTRegistry } = require('./UNS-Resolver.js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class UNSCLI {
  constructor() {
    this.resolver = new UNSResolver();
    this.registry = new DHTRegistry();
    this.configPath = path.join(process.env.HOME || process.env.USERPROFILE, '.uns');
    this.keyPath = path.join(this.configPath, 'identity.key');
  }

  /**
   * Initialize UNS CLI configuration
   */
  async init() {
    try {
      // Create config directory
      if (!fs.existsSync(this.configPath)) {
        fs.mkdirSync(this.configPath, { recursive: true });
      }

      // Generate identity key if not exists
      if (!fs.existsSync(this.keyPath)) {
        const keyPair = crypto.generateKeyPairSync('ed25519', {
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        
        const identity = {
          publicKey: keyPair.publicKey,
          privateKey: keyPair.privateKey,
          did: this.generateDID(keyPair.publicKey),
          created: new Date().toISOString()
        };
        
        fs.writeFileSync(this.keyPath, JSON.stringify(identity, null, 2));
        console.log('✅ UNS identity created');
        console.log(`DID: ${identity.did}`);
      } else {
        const identity = this.loadIdentity();
        console.log('✅ UNS already initialized');
        console.log(`DID: ${identity.did}`);
      }
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Generate DID from public key
   */
  generateDID(publicKey) {
    const keyBytes = Buffer.from(publicKey.replace(/-----[^-]+-----/g, ''), 'base64');
    const hash = crypto.createHash('sha256').update(keyBytes).digest();
    return `did:key:z${this.base58encode(hash)}`;
  }

  /**
   * Base58 encode (simplified)
   */
  base58encode(buffer) {
    // Simplified base58 encoding - would use proper library in production
    return buffer.toString('hex');
  }

  /**
   * Load identity from file
   */
  loadIdentity() {
    try {
      return JSON.parse(fs.readFileSync(this.keyPath, 'utf8'));
    } catch (error) {
      throw new Error('Identity not found. Run "uns init" first.');
    }
  }

  /**
   * Register a new network
   */
  async registerNetwork(network, resolverURL) {
    try {
      const identity = this.loadIdentity();
      
      // Validate network name
      if (!this.validateNetworkName(network)) {
        throw new Error('Invalid network name format');
      }

      // Check if network already exists
      const existing = await this.registry.lookup(network);
      if (existing) {
        throw new Error(`Network "${network}" already registered`);
      }

      const networkInfo = {
        network,
        owner: identity.did,
        resolvers: [resolverURL],
        subdomains: {},
        created: new Date().toISOString(),
        signature: this.signData({ network, owner: identity.did, resolvers: [resolverURL] }, identity.privateKey)
      };

      await this.registry.register(network, networkInfo);
      
      console.log(`✅ Network "${network}" registered successfully`);
      console.log(`Owner: ${identity.did}`);
      console.log(`Resolver: ${resolverURL}`);
    } catch (error) {
      console.error('❌ Network registration failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * List networks owned by current identity
   */
  async listNetworks() {
    try {
      const identity = this.loadIdentity();
      const networks = await this.registry.list(identity.did);
      
      if (networks.length === 0) {
        console.log('No networks registered for this identity');
        return;
      }

      console.log(`Networks owned by ${identity.did}:`);
      console.log('');
      
      networks.forEach(network => {
        console.log(`📡 ${network.network}`);
        console.log(`   Resolver: ${network.resolvers[0]}`);
        console.log(`   Subdomains: ${Object.keys(network.subdomains).length}`);
        console.log(`   Created: ${network.created}`);
        console.log('');
      });
    } catch (error) {
      console.error('❌ Failed to list networks:', error.message);
    }
  }

  /**
   * Add subdomain to network
   */
  async addSubdomain(network, subdomain, targetURL) {
    try {
      const identity = this.loadIdentity();
      
      // Validate subdomain format
      if (!subdomain.startsWith('.')) {
        throw new Error('Subdomain must start with a dot (e.g., .webapp)');
      }

      // Get network info
      const networkInfo = await this.registry.lookup(network);
      if (!networkInfo) {
        throw new Error(`Network "${network}" not found`);
      }

      if (networkInfo.owner !== identity.did) {
        throw new Error(`You don't own network "${network}"`);
      }

      // Add subdomain
      networkInfo.subdomains[subdomain] = targetURL;
      networkInfo.lastUpdate = new Date().toISOString();
      networkInfo.signature = this.signData(networkInfo, identity.privateKey);

      await this.registry.update(network, networkInfo);
      
      console.log(`✅ Subdomain "${subdomain}" added to network "${network}"`);
      console.log(`Target: ${targetURL}`);
      console.log(`Address: utopia.${network}//${subdomain}`);
    } catch (error) {
      console.error('❌ Failed to add subdomain:', error.message);
      process.exit(1);
    }
  }

  /**
   * Remove subdomain from network
   */
  async removeSubdomain(network, subdomain) {
    try {
      const identity = this.loadIdentity();
      
      const networkInfo = await this.registry.lookup(network);
      if (!networkInfo) {
        throw new Error(`Network "${network}" not found`);
      }

      if (networkInfo.owner !== identity.did) {
        throw new Error(`You don't own network "${network}"`);
      }

      if (!networkInfo.subdomains[subdomain]) {
        throw new Error(`Subdomain "${subdomain}" not found in network "${network}"`);
      }

      delete networkInfo.subdomains[subdomain];
      networkInfo.lastUpdate = new Date().toISOString();
      networkInfo.signature = this.signData(networkInfo, identity.privateKey);

      await this.registry.update(network, networkInfo);
      
      console.log(`✅ Subdomain "${subdomain}" removed from network "${network}"`);
    } catch (error) {
      console.error('❌ Failed to remove subdomain:', error.message);
      process.exit(1);
    }
  }

  /**
   * List subdomains in a network
   */
  async listSubdomains(network) {
    try {
      const networkInfo = await this.registry.lookup(network);
      if (!networkInfo) {
        throw new Error(`Network "${network}" not found`);
      }

      const subdomains = Object.keys(networkInfo.subdomains);
      if (subdomains.length === 0) {
        console.log(`No subdomains found in network "${network}"`);
        return;
      }

      console.log(`Subdomains in network "${network}":`);
      console.log('');
      
      Object.entries(networkInfo.subdomains).forEach(([subdomain, target]) => {
        console.log(`🌐 ${subdomain}`);
        console.log(`   Address: utopia.${network}//${subdomain}`);
        console.log(`   Target: ${target}`);
        console.log('');
      });
    } catch (error) {
      console.error('❌ Failed to list subdomains:', error.message);
    }
  }

  /**
   * Resolve UNS address
   */
  async resolve(address) {
    try {
      console.log(`🔍 Resolving: ${address}`);
      const resolvedURL = await this.resolver.resolve(address);
      console.log(`✅ Resolved to: ${resolvedURL}`);
    } catch (error) {
      console.error('❌ Resolution failed:', error.message);
    }
  }

  /**
   * Validate network name format
   */
  validateNetworkName(network) {
    return /^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$/.test(network);
  }

  /**
   * Sign data with private key
   */
  signData(data, privateKey) {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    const sign = crypto.createSign('SHA256');
    sign.update(dataString);
    return sign.sign(privateKey, 'base64');
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log(`
UNS CLI - Utopia Naming System Command Line Tool

USAGE:
  uns <command> [options]

COMMANDS:
  init                          Initialize UNS identity
  register <network> <resolver> Register a new network
  networks                      List owned networks
  subdomain add <network> <sub> <url>    Add subdomain
  subdomain remove <network> <sub>       Remove subdomain
  subdomain list <network>               List subdomains
  resolve <address>                      Resolve UNS address

EXAMPLES:
  uns init
  uns register mynetwork https://myserver.com/uns
  uns subdomain add mynetwork .webapp https://myapp.com
  uns subdomain list mynetwork
  uns resolve utopia.mynetwork//.webapp

For more information, visit: https://github.com/utopia-naming-system
    `);
  }
}

// CLI entry point
async function main() {
  const cli = new UNSCLI();
  const args = process.argv.slice(2);

  if (args.length === 0) {
    cli.showHelp();
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case 'init':
        await cli.init();
        break;
      
      case 'register':
        if (args.length < 3) {
          console.error('Usage: uns register <network> <resolver-url>');
          process.exit(1);
        }
        await cli.registerNetwork(args[1], args[2]);
        break;
      
      case 'networks':
        await cli.listNetworks();
        break;
      
      case 'subdomain':
        const subcommand = args[1];
        switch (subcommand) {
          case 'add':
            if (args.length < 5) {
              console.error('Usage: uns subdomain add <network> <subdomain> <target-url>');
              process.exit(1);
            }
            await cli.addSubdomain(args[2], args[3], args[4]);
            break;
          
          case 'remove':
            if (args.length < 4) {
              console.error('Usage: uns subdomain remove <network> <subdomain>');
              process.exit(1);
            }
            await cli.removeSubdomain(args[2], args[3]);
            break;
          
          case 'list':
            if (args.length < 3) {
              console.error('Usage: uns subdomain list <network>');
              process.exit(1);
            }
            await cli.listSubdomains(args[2]);
            break;
          
          default:
            console.error('Unknown subdomain command. Use: add, remove, or list');
            process.exit(1);
        }
        break;
      
      case 'resolve':
        if (args.length < 2) {
          console.error('Usage: uns resolve <uns-address>');
          process.exit(1);
        }
        await cli.resolve(args[1]);
        break;
      
      case 'help':
      case '--help':
      case '-h':
        cli.showHelp();
        break;
      
      default:
        console.error(`Unknown command: ${command}`);
        cli.showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Command failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = UNSCLI;
