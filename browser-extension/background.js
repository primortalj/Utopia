/**
 * UNS Browser Extension - Background Service Worker
 * Handles UNS address resolution and request interception
 */

// Import UNS Resolver (simplified for extension context)
class UNSExtensionResolver {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 3600000; // 1 hour in milliseconds
    this.registries = ['https://registry.utopia.network', 'https://dht.uns.org'];
  }

  async resolve(address) {
    const cacheKey = address.toLowerCase();
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.url;
    }

    try {
      const parsed = this.parseAddress(address);
      const resolvedURL = await this.performResolution(parsed);
      
      // Cache the result
      this.cache.set(cacheKey, {
        url: resolvedURL,
        timestamp: Date.now()
      });

      return resolvedURL;
    } catch (error) {
      console.error(`UNS resolution failed for ${address}:`, error);
      throw error;
    }
  }

  parseAddress(address) {
    const match = address.match(/^utopia\.([^\/]+)\/\/(.*)$/);
    if (!match) {
      throw new Error(`Invalid UNS address: ${address}`);
    }

    const [, network, path] = match;
    return { network, path };
  }

  async performResolution(parsed) {
    // Try each registry in order
    for (const registryURL of this.registries) {
      try {
        const response = await fetch(`${registryURL}/resolve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            network: parsed.network,
            path: parsed.path
          })
        });

        if (response.ok) {
          const result = await response.json();
          return result.url;
        }
      } catch (error) {
        console.warn(`Registry ${registryURL} failed:`, error);
        continue;
      }
    }

    // Fallback to mock data for demo
    return this.mockResolve(parsed);
  }

  mockResolve(parsed) {
    const mockData = {
      'dillanet': {
        '.obsidiannotes': 'https://notes.dillanet.org',
        '.nextcloud': 'https://cloud.dillanet.org',
        '.git': 'https://git.dillanet.org'
      },
      'alice': {
        '.blog': 'https://alice.blog',
        '.photos': 'https://photos.alice.cloud'
      }
    };

    const network = mockData[parsed.network];
    if (network) {
      if (parsed.path.startsWith('.')) {
        const subdomain = parsed.path.split('/')[0];
        const baseURL = network[subdomain];
        if (baseURL) {
          const remainingPath = parsed.path.substring(subdomain.length);
          return baseURL + remainingPath;
        }
      }
    }

    throw new Error(`No resolver found for utopia.${parsed.network}//${parsed.path}`);
  }
}

// Global resolver instance
const unsResolver = new UNSExtensionResolver();

// Statistics tracking
let stats = {
  totalResolutions: 0,
  successfulResolutions: 0,
  failedResolutions: 0,
  cacheHits: 0,
  lastReset: Date.now()
};

// Initialize extension
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('UNS Extension installed');
    
    // Set default options
    chrome.storage.sync.set({
      enabled: true,
      autoRedirect: true,
      showNotifications: true,
      customRegistries: []
    });
    
    // Show welcome page
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html')
    });
  }
});

// Handle web requests to utopia.* domains
chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    try {
      const settings = await chrome.storage.sync.get(['enabled', 'autoRedirect']);
      
      if (!settings.enabled || !settings.autoRedirect) {
        return {};
      }

      const url = new URL(details.url);
      const unsAddress = `utopia.${url.hostname.replace(/^utopia\./, '')}//${url.pathname}${url.search}${url.hash}`;
      
      stats.totalResolutions++;
      
      const resolvedURL = await unsResolver.resolve(unsAddress);
      stats.successfulResolutions++;
      
      console.log(`UNS resolved: ${unsAddress} -> ${resolvedURL}`);
      
      // Show notification if enabled
      const showNotifications = await chrome.storage.sync.get('showNotifications');
      if (showNotifications.showNotifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'UNS Resolution',
          message: `Redirected to ${new URL(resolvedURL).hostname}`
        });
      }
      
      return { redirectUrl: resolvedURL };
    } catch (error) {
      stats.failedResolutions++;
      console.error('UNS resolution failed:', error);
      
      // Show error page
      const errorPageURL = chrome.runtime.getURL('error.html') + 
        '?address=' + encodeURIComponent(details.url) + 
        '&error=' + encodeURIComponent(error.message);
      
      return { redirectUrl: errorPageURL };
    }
  },
  { urls: ["*://utopia.*/*"] },
  ["blocking"]
);

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'resolve':
      unsResolver.resolve(request.address)
        .then(url => sendResponse({ success: true, url }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Will respond asynchronously

    case 'getStats':
      sendResponse({
        ...stats,
        cacheSize: unsResolver.cache.size
      });
      break;

    case 'clearCache':
      unsResolver.cache.clear();
      sendResponse({ success: true });
      break;

    case 'resetStats':
      stats = {
        totalResolutions: 0,
        successfulResolutions: 0,
        failedResolutions: 0,
        cacheHits: 0,
        lastReset: Date.now()
      };
      sendResponse({ success: true });
      break;

    case 'exportData':
      const exportData = {
        cache: Array.from(unsResolver.cache.entries()),
        stats: stats,
        timestamp: Date.now()
      };
      sendResponse({ data: exportData });
      break;

    case 'importData':
      if (request.data && request.data.cache) {
        unsResolver.cache = new Map(request.data.cache);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Invalid data format' });
      }
      break;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Context menu integration
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'resolve-selection') {
    const selectedText = info.selectionText.trim();
    
    if (selectedText.startsWith('utopia.')) {
      unsResolver.resolve(selectedText)
        .then(url => {
          chrome.tabs.create({ url });
        })
        .catch(error => {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'UNS Resolution Failed',
            message: `Could not resolve: ${selectedText}`
          });
        });
    }
  }
});

// Create context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'resolve-selection',
    title: 'Resolve UNS Address',
    contexts: ['selection']
  });
});

// Periodic cache cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of unsResolver.cache.entries()) {
    if (now - value.timestamp > unsResolver.cacheTTL) {
      unsResolver.cache.delete(key);
    }
  }
}, 300000); // Clean every 5 minutes

// Handle alarm events for periodic tasks
chrome.alarms.onAlarm.addListener((alarm) => {
  switch (alarm.name) {
    case 'cache-cleanup':
      // Cache cleanup logic
      break;
    case 'stats-report':
      // Send anonymous usage statistics (if user opted in)
      break;
  }
});

// Set up periodic alarms
chrome.alarms.create('cache-cleanup', { periodInMinutes: 5 });
chrome.alarms.create('stats-report', { periodInMinutes: 60 });
