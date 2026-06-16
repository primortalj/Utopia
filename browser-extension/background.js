/**
 * UNS Browser Extension - Background Service Worker
 * Handles UNS address resolution and request interception
 */

const DEFAULT_REGISTRIES = [
  'https://registry.utopia.network',
  'https://dht.uns.org'
];

class UNSExtensionResolver {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 3600000; // 1 hour in milliseconds
    this.registries = [...DEFAULT_REGISTRIES];
  }

  async syncRegistries() {
    try {
      const result = await chrome.storage.sync.get('customRegistries');
      if (Array.isArray(result.customRegistries) && result.customRegistries.length) {
        this.registries = result.customRegistries;
      }
    } catch (error) {
      console.warn('Failed to load custom registries; using defaults.', error);
    }
  }

  async resolve(address) {
    const cacheKey = address.toLowerCase();
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.url;
    }

    try {
      await this.syncRegistries();
      const parsed = this.parseAddress(address);
      const resolvedURL = await this.performResolution(parsed);

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
    for (const registryURL of this.registries) {
      try {
        const url = new URL('/resolve', registryURL);
        url.searchParams.set('network', parsed.network);
        url.searchParams.set('path', parsed.path);

        const response = await fetch(url.toString());

        if (response.ok) {
          const body = await response.json().catch(() => null);
          if (body && typeof body.url === 'string') {
            return body.url;
          }
        }
      } catch (error) {
        console.warn(`Registry ${registryURL} failed:`, error);
        continue;
      }
    }

    throw new Error(`No resolver found for utopia.${parsed.network}//${parsed.path}`);
  }
}

const unsResolver = new UNSExtensionResolver();

let stats = {
  totalResolutions: 0,
  successfulResolutions: 0,
  failedResolutions: 0,
  cacheHits: 0,
  lastReset: Date.now()
};

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('UNS Extension installed');
    chrome.storage.sync.set({
      enabled: true,
      autoRedirect: true,
      showNotifications: true,
      customRegistries: []
    });
  }
});

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
      return {};
    }
  },
  { urls: ["*://utopia.*/*"] },
  ["blocking"]
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'resolve':
      unsResolver.resolve(request.address)
        .then(url => sendResponse({ success: true, url }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

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
      sendResponse({
        data: {
          cache: Array.from(unsResolver.cache.entries()),
          stats,
          timestamp: Date.now()
        }
      });
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

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'resolve-selection') {
    const selectedText = info.selectionText.trim();

    if (selectedText.startsWith('utopia.')) {
      unsResolver.resolve(selectedText)
        .then(url => {
          chrome.tabs.create({ url });
        })
        .catch(() => {
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

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'resolve-selection',
    title: 'Resolve UNS Address',
    contexts: ['selection']
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of unsResolver.cache.entries()) {
    if (now - value.timestamp > unsResolver.cacheTTL) {
      unsResolver.cache.delete(key);
    }
  }
}, 300000);

chrome.alarms.onAlarm.addListener((alarm) => {
  switch (alarm.name) {
    case 'cache-cleanup':
      break;
    case 'stats-report':
      break;
  }
});

chrome.alarms.create('cache-cleanup', { periodInMinutes: 5 });
chrome.alarms.create('stats-report', { periodInMinutes: 60 });
