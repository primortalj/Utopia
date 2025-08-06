/**
 * UNS Chrome Extension - Options Script
 * Handles the options/settings page functionality
 */

class UNSOptions {
  constructor() {
    this.defaultSettings = {
      enabled: true,
      autoRedirect: true,
      showNotifications: true,
      customRegistries: [
        'https://registry.utopia.network',
        'https://dht.uns.org'
      ],
      cacheTtl: 3600,
      requestTimeout: 10,
      debugMode: false,
      userAgent: '',
      fallbackBehavior: 'error'
    };
    
    this.currentSettings = { ...this.defaultSettings };
    this.stats = {};
    
    this.init();
  }

  async init() {
    await this.loadSettings();
    await this.loadStats();
    
    this.populateUI();
    this.bindEvents();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(Object.keys(this.defaultSettings));
      this.currentSettings = { ...this.defaultSettings, ...result };
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.showMessage('Failed to load settings', 'error');
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

  populateUI() {
    // Basic settings
    document.getElementById('enabledCheckbox').checked = this.currentSettings.enabled;
    document.getElementById('autoRedirectCheckbox').checked = this.currentSettings.autoRedirect;
    document.getElementById('showNotificationsCheckbox').checked = this.currentSettings.showNotifications;
    
    // Performance settings
    document.getElementById('cacheTtl').value = this.currentSettings.cacheTtl;
    document.getElementById('requestTimeout').value = this.currentSettings.requestTimeout;
    
    // Advanced settings
    document.getElementById('debugModeCheckbox').checked = this.currentSettings.debugMode;
    document.getElementById('userAgent').value = this.currentSettings.userAgent;
    document.getElementById('fallbackBehavior').value = this.currentSettings.fallbackBehavior;
    
    // Registries
    this.populateRegistries();
    
    // Statistics
    this.populateStats();
  }

  populateRegistries() {
    const registryList = document.getElementById('registryList');
    registryList.innerHTML = '';
    
    this.currentSettings.customRegistries.forEach((registry, index) => {
      const registryItem = document.createElement('div');
      registryItem.className = 'registry-item';
      registryItem.innerHTML = `
        <input type="text" value="${registry}" onchange="updateRegistry(${index}, this.value)">
        <button class="btn danger small" onclick="removeRegistry(${index})">Remove</button>
      `;
      registryList.appendChild(registryItem);
    });
  }

  populateStats() {
    const statsGrid = document.getElementById('statsGrid');
    const totalResolutions = this.stats.totalResolutions || 0;
    const successfulResolutions = this.stats.successfulResolutions || 0;
    const failedResolutions = this.stats.failedResolutions || 0;
    const cacheSize = this.stats.cacheSize || 0;
    const successRate = totalResolutions > 0 ? Math.round((successfulResolutions / totalResolutions) * 100) : 0;
    
    statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-number">${totalResolutions}</div>
        <div class="stat-label">Total Resolutions</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${successfulResolutions}</div>
        <div class="stat-label">Successful</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${failedResolutions}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${successRate}%</div>
        <div class="stat-label">Success Rate</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${cacheSize}</div>
        <div class="stat-label">Cache Entries</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${this.currentSettings.customRegistries.length}</div>
        <div class="stat-label">Registries</div>
      </div>
    `;
  }

  bindEvents() {
    // Save button
    document.getElementById('saveButton').addEventListener('click', () => {
      this.saveSettings();
    });

    // Checkbox events for real-time preview
    const checkboxes = [
      'enabledCheckbox',
      'autoRedirectCheckbox', 
      'showNotificationsCheckbox',
      'debugModeCheckbox'
    ];
    
    checkboxes.forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
        this.updatePreview();
      });
    });

    // Input events for real-time validation
    document.getElementById('cacheTtl').addEventListener('input', (e) => {
      this.validateCacheTtl(e.target);
    });

    document.getElementById('requestTimeout').addEventListener('input', (e) => {
      this.validateTimeout(e.target);
    });

    document.getElementById('newRegistryUrl').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addRegistry();
      }
    });
  }

  updatePreview() {
    // Show preview of current settings without saving
    const enabled = document.getElementById('enabledCheckbox').checked;
    const autoRedirect = document.getElementById('autoRedirectCheckbox').checked;
    
    if (!enabled) {
      this.showMessage('UNS Resolver is disabled - no addresses will be resolved', 'warning');
    } else if (!autoRedirect) {
      this.showMessage('Auto-redirect is disabled - you will need to manually navigate to resolved addresses', 'warning');
    } else {
      this.hideMessage();
    }
  }

  validateCacheTtl(input) {
    const value = parseInt(input.value);
    if (value < 60) {
      input.setCustomValidity('Cache TTL must be at least 60 seconds');
    } else if (value > 86400) {
      input.setCustomValidity('Cache TTL cannot exceed 24 hours');
    } else {
      input.setCustomValidity('');
    }
  }

  validateTimeout(input) {
    const value = parseInt(input.value);
    if (value < 5) {
      input.setCustomValidity('Timeout must be at least 5 seconds');
    } else if (value > 60) {
      input.setCustomValidity('Timeout cannot exceed 60 seconds');
    } else {
      input.setCustomValidity('');
    }
  }

  async saveSettings() {
    const saveButton = document.getElementById('saveButton');
    const originalText = saveButton.textContent;
    
    try {
      saveButton.textContent = 'Saving...';
      saveButton.disabled = true;
      
      // Collect settings from form
      const newSettings = {
        enabled: document.getElementById('enabledCheckbox').checked,
        autoRedirect: document.getElementById('autoRedirectCheckbox').checked,
        showNotifications: document.getElementById('showNotificationsCheckbox').checked,
        customRegistries: this.currentSettings.customRegistries,
        cacheTtl: parseInt(document.getElementById('cacheTtl').value),
        requestTimeout: parseInt(document.getElementById('requestTimeout').value),
        debugMode: document.getElementById('debugModeCheckbox').checked,
        userAgent: document.getElementById('userAgent').value.trim(),
        fallbackBehavior: document.getElementById('fallbackBehavior').value
      };
      
      // Validate settings
      if (newSettings.cacheTtl < 60 || newSettings.cacheTtl > 86400) {
        throw new Error('Invalid cache TTL value');
      }
      
      if (newSettings.requestTimeout < 5 || newSettings.requestTimeout > 60) {
        throw new Error('Invalid request timeout value');
      }
      
      if (newSettings.customRegistries.length === 0) {
        throw new Error('At least one registry is required');
      }
      
      // Save to storage
      await chrome.storage.sync.set(newSettings);
      this.currentSettings = newSettings;
      
      this.showMessage('Settings saved successfully!', 'success');
      
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showMessage(`Failed to save settings: ${error.message}`, 'error');
    } finally {
      saveButton.textContent = originalText;
      saveButton.disabled = false;
    }
  }

  addRegistry() {
    const input = document.getElementById('newRegistryUrl');
    const url = input.value.trim();
    
    if (!url) {
      this.showMessage('Please enter a registry URL', 'error');
      return;
    }
    
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      this.showMessage('Registry URL must start with http:// or https://', 'error');
      return;
    }
    
    if (this.currentSettings.customRegistries.includes(url)) {
      this.showMessage('Registry already exists', 'error');
      return;
    }
    
    this.currentSettings.customRegistries.push(url);
    this.populateRegistries();
    input.value = '';
    
    this.showMessage('Registry added (remember to save settings)', 'success');
  }

  removeRegistry(index) {
    if (this.currentSettings.customRegistries.length <= 1) {
      this.showMessage('Cannot remove the last registry', 'error');
      return;
    }
    
    this.currentSettings.customRegistries.splice(index, 1);
    this.populateRegistries();
    
    this.showMessage('Registry removed (remember to save settings)', 'success');
  }

  updateRegistry(index, newUrl) {
    if (!newUrl.startsWith('https://') && !newUrl.startsWith('http://')) {
      this.showMessage('Registry URL must start with http:// or https://', 'error');
      this.populateRegistries(); // Reset to previous value
      return;
    }
    
    this.currentSettings.customRegistries[index] = newUrl;
  }

  async clearCache() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'clearCache' });
      if (response && response.success) {
        this.showMessage('Cache cleared successfully', 'success');
        await this.loadStats();
        this.populateStats();
      } else {
        this.showMessage('Failed to clear cache', 'error');
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      this.showMessage('Failed to clear cache', 'error');
    }
  }

  async clearHistory() {
    try {
      await chrome.storage.local.remove(['recentResolutions']);
      this.showMessage('History cleared successfully', 'success');
    } catch (error) {
      console.error('Failed to clear history:', error);
      this.showMessage('Failed to clear history', 'error');
    }
  }

  async resetStats() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'resetStats' });
      if (response && response.success) {
        this.showMessage('Statistics reset successfully', 'success');
        await this.loadStats();
        this.populateStats();
      } else {
        this.showMessage('Failed to reset statistics', 'error');
      }
    } catch (error) {
      console.error('Failed to reset stats:', error);
      this.showMessage('Failed to reset statistics', 'error');
    }
  }

  async exportData() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'exportData' });
      if (response && response.data) {
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `uns-export-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        this.showMessage('Data exported successfully', 'success');
      } else {
        this.showMessage('Failed to export data', 'error');
      }
    } catch (error) {
      console.error('Failed to export data:', error);
      this.showMessage('Failed to export data', 'error');
    }
  }

  async resetAllSettings() {
    if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      return;
    }
    
    try {
      await chrome.storage.sync.clear();
      await chrome.storage.local.clear();
      
      this.currentSettings = { ...this.defaultSettings };
      this.populateUI();
      
      this.showMessage('All settings reset to defaults', 'success');
    } catch (error) {
      console.error('Failed to reset settings:', error);
      this.showMessage('Failed to reset settings', 'error');
    }
  }

  loadDefaults() {
    if (!confirm('Restore default settings? Unsaved changes will be lost.')) {
      return;
    }
    
    this.currentSettings = { ...this.defaultSettings };
    this.populateUI();
    this.showMessage('Default settings loaded (remember to save)', 'success');
  }

  showMessage(message, type) {
    const messageEl = document.getElementById('statusMessage');
    messageEl.textContent = message;
    messageEl.className = `status-message ${type}`;
    messageEl.style.display = 'block';
    
    // Auto-hide after 5 seconds for success messages
    if (type === 'success') {
      setTimeout(() => {
        this.hideMessage();
      }, 5000);
    }
  }

  hideMessage() {
    const messageEl = document.getElementById('statusMessage');
    messageEl.style.display = 'none';
  }
}

// Tab switching functionality
function showTab(tabName) {
  // Hide all tabs
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Remove active class from all tab buttons
  const tabButtons = document.querySelectorAll('.tab');
  tabButtons.forEach(button => {
    button.classList.remove('active');
  });
  
  // Show selected tab
  document.getElementById(tabName).classList.add('active');
  
  // Add active class to clicked tab button
  event.target.classList.add('active');
}

// Global functions for HTML onclick handlers
let optionsInstance;

function addRegistry() {
  optionsInstance.addRegistry();
}

function removeRegistry(index) {
  optionsInstance.removeRegistry(index);
}

function updateRegistry(index, newUrl) {
  optionsInstance.updateRegistry(index, newUrl);
}

function clearCache() {
  optionsInstance.clearCache();
}

function clearHistory() {
  optionsInstance.clearHistory();
}

function resetStats() {
  optionsInstance.resetStats();
}

function exportData() {
  optionsInstance.exportData();
}

function resetAllSettings() {
  optionsInstance.resetAllSettings();
}

function loadDefaults() {
  optionsInstance.loadDefaults();
}

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  optionsInstance = new UNSOptions();
});
