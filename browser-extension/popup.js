/**
 * UNS Chrome Extension - Popup Script
 * Handles the popup UI interactions and communication with background script
 */

class UNSPopup {
  constructor() {
    this.settings = {
      enabled: true,
      autoRedirect: true,
      showNotifications: true
    };
    this.stats = {
      totalResolutions: 0,
      successfulResolutions: 0,
      failedResolutions: 0,
      cacheSize: 0
    };
    this.recentResolutions = [];
    
    this.init();
  }

  async init() {
    await this.loadSettings();
    await this.loadStats();
    await this.loadRecentResolutions();
    
    this.updateUI();
    this.bindEvents();
    
    // Refresh stats every 5 seconds
    setInterval(() => this.refreshStats(), 5000);
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['enabled', 'autoRedirect', 'showNotifications']);
      this.settings = { ...this.settings, ...result };
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async loadStats() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getStats' });
      if (response) {
        this.stats = response;
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  async loadRecentResolutions() {
    try {
      const result = await chrome.storage.local.get(['recentResolutions']);
      this.recentResolutions = result.recentResolutions || [];
    } catch (error) {
      console.error('Failed to load recent resolutions:', error);
    }
  }

  updateUI() {
    this.updateStatus();
    this.updateStats();
    this.updateRecentResolutions();
  }

  updateStatus() {
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const toggleSwitch = document.getElementById('toggleSwitch');

    if (this.settings.enabled) {
      statusIndicator.className = 'status-indicator enabled';
      statusText.textContent = 'UNS Resolver Active';
      toggleSwitch.className = 'toggle-switch enabled';
    } else {
      statusIndicator.className = 'status-indicator disabled';
      statusText.textContent = 'UNS Resolver Disabled';
      toggleSwitch.className = 'toggle-switch';
    }
  }

  updateStats() {
    document.getElementById('totalResolutions').textContent = this.stats.totalResolutions;
    document.getElementById('cacheSize').textContent = this.stats.cacheSize;
    
    const successRate = this.stats.totalResolutions > 0 
      ? Math.round((this.stats.successfulResolutions / this.stats.totalResolutions) * 100)
      : 0;
    document.getElementById('successRate').textContent = `${successRate}%`;
  }

  updateRecentResolutions() {
    const container = document.getElementById('recentResolutions');
    
    if (this.recentResolutions.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; opacity: 0.5; font-size: 12px; padding: 20px;">
          No recent resolutions
        </div>
      `;
      return;
    }

    container.innerHTML = this.recentResolutions
      .slice(-5)
      .reverse()
      .map(resolution => `
        <div class="resolution-item">
          <div class="resolution-address">${resolution.address}</div>
          <div class="resolution-target">${resolution.target}</div>
        </div>
      `).join('');
  }

  bindEvents() {
    // Toggle switch
    document.getElementById('toggleSwitch').addEventListener('click', () => {
      this.toggleResolver();
    });

    // Resolve button
    document.getElementById('resolveBtn').addEventListener('click', () => {
      this.resolveAddress();
    });

    // Visit button
    document.getElementById('visitBtn').addEventListener('click', () => {
      this.visitResolvedSite();
    });

    // Clear cache button
    document.getElementById('clearCacheBtn').addEventListener('click', () => {
      this.clearCache();
    });

    // Options button
    document.getElementById('optionsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // Footer links
    document.getElementById('githubLink').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://github.com/primortalj/Utopia' });
    });

    document.getElementById('docsLink').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://github.com/primortalj/Utopia/blob/master/UNS-Technical-Specification.md' });
    });

    document.getElementById('supportLink').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://github.com/primortalj/Utopia/issues' });
    });

    // Enter key in address input
    document.getElementById('testAddress').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.resolveAddress();
      }
    });
  }

  async toggleResolver() {
    this.settings.enabled = !this.settings.enabled;
    
    try {
      await chrome.storage.sync.set({ enabled: this.settings.enabled });
      this.updateStatus();
      
      // Show feedback
      this.showToast(
        this.settings.enabled ? 'UNS Resolver enabled' : 'UNS Resolver disabled',
        this.settings.enabled ? 'success' : 'info'
      );
    } catch (error) {
      console.error('Failed to toggle resolver:', error);
      this.showToast('Failed to update settings', 'error');
    }
  }

  async resolveAddress() {
    const addressInput = document.getElementById('testAddress');
    const address = addressInput.value.trim();
    
    if (!address) {
      this.showToast('Please enter a UNS address', 'error');
      return;
    }

    if (!address.startsWith('utopia.')) {
      this.showToast('Address must start with "utopia."', 'error');
      return;
    }

    this.showLoading(true);
    this.hideResult();

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'resolve',
        address: address
      });

      this.showLoading(false);

      if (response.success) {
        this.showResult(response.url, 'success');
        this.lastResolvedUrl = response.url;
        document.getElementById('visitBtn').style.display = 'inline-block';
        
        // Add to recent resolutions
        this.addRecentResolution(address, response.url);
        
        this.showToast('Address resolved successfully!', 'success');
      } else {
        this.showResult(response.error, 'error');
        document.getElementById('visitBtn').style.display = 'none';
        this.showToast('Resolution failed', 'error');
      }
    } catch (error) {
      this.showLoading(false);
      this.showResult('Failed to communicate with resolver', 'error');
      this.showToast('Communication error', 'error');
    }

    // Refresh stats
    await this.refreshStats();
  }

  async addRecentResolution(address, target) {
    const resolution = {
      address,
      target,
      timestamp: Date.now()
    };

    this.recentResolutions.push(resolution);
    
    // Keep only last 10 resolutions
    if (this.recentResolutions.length > 10) {
      this.recentResolutions = this.recentResolutions.slice(-10);
    }

    try {
      await chrome.storage.local.set({ recentResolutions: this.recentResolutions });
      this.updateRecentResolutions();
    } catch (error) {
      console.error('Failed to save recent resolution:', error);
    }
  }

  visitResolvedSite() {
    if (this.lastResolvedUrl) {
      chrome.tabs.create({ url: this.lastResolvedUrl });
    }
  }

  async clearCache() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'clearCache' });
      if (response.success) {
        this.showToast('Cache cleared successfully', 'success');
        await this.refreshStats();
      } else {
        this.showToast('Failed to clear cache', 'error');
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      this.showToast('Failed to clear cache', 'error');
    }
  }

  async refreshStats() {
    await this.loadStats();
    this.updateStats();
  }

  showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    const resolveBtn = document.getElementById('resolveBtn');
    
    if (show) {
      spinner.style.display = 'block';
      resolveBtn.disabled = true;
      resolveBtn.textContent = 'Resolving...';
    } else {
      spinner.style.display = 'none';
      resolveBtn.disabled = false;
      resolveBtn.textContent = 'Resolve';
    }
  }

  showResult(message, type) {
    const resultDiv = document.getElementById('resolveResult');
    resultDiv.className = `result ${type}`;
    resultDiv.textContent = message;
    resultDiv.style.display = 'block';
  }

  hideResult() {
    const resultDiv = document.getElementById('resolveResult');
    resultDiv.style.display = 'none';
  }

  showToast(message, type = 'info') {
    // Create toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 5px;
      color: white;
      font-size: 12px;
      font-weight: bold;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s;
      max-width: 250px;
      word-wrap: break-word;
    `;

    switch (type) {
      case 'success':
        toast.style.background = '#4CAF50';
        break;
      case 'error':
        toast.style.background = '#F44336';
        break;
      default:
        toast.style.background = '#2196F3';
    }

    toast.textContent = message;
    document.body.appendChild(toast);

    // Fade in
    setTimeout(() => {
      toast.style.opacity = '1';
    }, 10);

    // Fade out and remove
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new UNSPopup();
});
