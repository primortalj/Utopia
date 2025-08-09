/**
 * UNS Chrome Extension - Content Script
 * Runs on all web pages to enhance UNS integration
 */

(function() {
    'use strict';

    class UNSContentScript {
        constructor() {
            this.isUNSPage = false;
            this.init();
        }

        init() {
            this.checkCurrentPage();
            this.injectUNSHelper();
            this.enhanceUNSLinks();
            this.setupPageObserver();
        }

        checkCurrentPage() {
            // Check if current page is a UNS address
            const hostname = window.location.hostname;
            if (hostname.startsWith('utopia.')) {
                this.isUNSPage = true;
                this.handleUNSPage();
            }
        }

        handleUNSPage() {
            // Show UNS indicator
            this.showUNSIndicator();
            
            // Add UNS badge to favicon if possible
            this.updateFavicon();
        }

        showUNSIndicator() {
            // Create floating UNS indicator
            const indicator = document.createElement('div');
            indicator.id = 'uns-page-indicator';
            indicator.innerHTML = `
                <div style="
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: bold;
                    z-index: 10000;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                    cursor: pointer;
                    transition: all 0.3s;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    🌍 UNS Resolved
                </div>
            `;
            
            document.body.appendChild(indicator);
            
            // Add click handler to show more info
            indicator.addEventListener('click', () => {
                this.showUNSInfo();
            });

            // Auto-hide after 5 seconds
            setTimeout(() => {
                indicator.style.opacity = '0';
                setTimeout(() => {
                    if (indicator.parentNode) {
                        indicator.parentNode.removeChild(indicator);
                    }
                }, 300);
            }, 5000);
        }

        showUNSInfo() {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            `;

            modal.innerHTML = `
                <div style="
                    background: white;
                    padding: 30px;
                    border-radius: 15px;
                    max-width: 500px;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                ">
                    <div style="display: flex; align-items: center; margin-bottom: 20px;">
                        <div style="font-size: 24px; margin-right: 10px;">🌍</div>
                        <div>
                            <h2 style="margin: 0; color: #333;">UNS Address Resolved</h2>
                            <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">This page was accessed via the Utopia Naming System</p>
                        </div>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="margin: 0; font-size: 14px; color: #666;"><strong>Original UNS Address:</strong></p>
                        <p style="margin: 5px 0 0 0; font-family: monospace; color: #333;">${this.getOriginalUNSAddress()}</p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="margin: 0; font-size: 14px; color: #666;"><strong>Resolved to:</strong></p>
                        <p style="margin: 5px 0 0 0; font-family: monospace; color: #333;">${window.location.href}</p>
                    </div>
                    
                    <div style="text-align: center;">
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 14px;
                        ">Close</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Close on background click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }

        getOriginalUNSAddress() {
            // Try to get original UNS address from referrer or storage
            const referrer = document.referrer;
            if (referrer && referrer.includes('utopia.')) {
                return referrer;
            }
            
            // Fallback: construct likely UNS address from current hostname
            return `utopia.${window.location.hostname}//${window.location.pathname}${window.location.search}`;
        }

        updateFavicon() {
            // Add UNS indicator to favicon if possible
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 16;
                canvas.height = 16;
                const ctx = canvas.getContext('2d');
                
                // Draw UNS indicator
                ctx.fillStyle = '#667eea';
                ctx.fillRect(0, 0, 16, 16);
                ctx.fillStyle = 'white';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('U', 8, 12);
                
                // Create new favicon link
                const link = document.createElement('link');
                link.type = 'image/x-icon';
                link.rel = 'shortcut icon';
                link.href = canvas.toDataURL('image/x-icon');
                
                // Remove existing favicon
                const existingFavicon = document.querySelector('link[rel="shortcut icon"]');
                if (existingFavicon) {
                    existingFavicon.remove();
                }
                
                document.getElementsByTagName('head')[0].appendChild(link);
            } catch (error) {
                // Silently fail if favicon update doesn't work
                console.debug('Could not update favicon:', error);
            }
        }

        injectUNSHelper() {
            // Inject UNS helper functions into the page
            const script = document.createElement('script');
            script.textContent = `
                // UNS Helper Functions
                window.UNS = {
                    resolve: async function(address) {
                        return new Promise((resolve, reject) => {
                            chrome.runtime.sendMessage({
                                action: 'resolve',
                                address: address
                            }, (response) => {
                                if (response && response.success) {
                                    resolve(response.url);
                                } else {
                                    reject(new Error(response ? response.error : 'Resolution failed'));
                                }
                            });
                        });
                    },
                    
                    isUNSAddress: function(address) {
                        return typeof address === 'string' && address.startsWith('utopia.');
                    },
                    
                    parseUNSAddress: function(address) {
                        const match = address.match(/^utopia\\.([^\\/]+)\\/\\/(.*)$/);
                        if (!match) return null;
                        return {
                            protocol: 'utopia',
                            network: match[1],
                            path: match[2]
                        };
                    }
                };
                
                // Dispatch UNS ready event
                window.dispatchEvent(new CustomEvent('UNSReady', { detail: window.UNS }));
            `;
            
            (document.head || document.documentElement).appendChild(script);
            script.remove();
        }

        enhanceUNSLinks() {
            // Find and enhance UNS links on the page
            const links = document.querySelectorAll('a[href^="utopia."]');
            
            links.forEach(link => {
                this.enhanceUNSLink(link);
            });
        }

        enhanceUNSLink(link) {
            // Add visual indicator for UNS links
            if (!link.dataset.unsEnhanced) {
                link.dataset.unsEnhanced = 'true';
                
                // Add UNS icon
                const icon = document.createElement('span');
                icon.innerHTML = '🌍';
                icon.style.marginRight = '4px';
                icon.style.fontSize = '0.9em';
                icon.title = 'UNS Address - Will be resolved automatically';
                
                link.insertBefore(icon, link.firstChild);
                
                // Add hover effect
                const originalBg = link.style.backgroundColor;
                link.addEventListener('mouseenter', () => {
                    link.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
                });
                link.addEventListener('mouseleave', () => {
                    link.style.backgroundColor = originalBg;
                });
                
                // Add click handler for additional feedback
                link.addEventListener('click', (e) => {
                    this.showResolutionFeedback(link);
                });
            }
        }

        showResolutionFeedback(link) {
            // Show loading indicator while resolving
            const feedback = document.createElement('div');
            feedback.style.cssText = `
                position: absolute;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 12px;
                z-index: 10000;
                pointer-events: none;
                white-space: nowrap;
            `;
            feedback.textContent = 'Resolving UNS address...';
            
            // Position feedback near the link
            const rect = link.getBoundingClientRect();
            feedback.style.left = rect.left + 'px';
            feedback.style.top = (rect.bottom + 5) + 'px';
            
            document.body.appendChild(feedback);
            
            // Remove after short delay
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 1000);
        }

        setupPageObserver() {
            // Watch for dynamically added UNS links
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if the node itself is a UNS link
                            if (node.tagName === 'A' && node.href && node.href.startsWith('utopia.')) {
                                this.enhanceUNSLink(node);
                            }
                            
                            // Check for UNS links within the added node
                            const unsLinks = node.querySelectorAll && node.querySelectorAll('a[href^="utopia."]');
                            if (unsLinks) {
                                unsLinks.forEach(link => this.enhanceUNSLink(link));
                            }
                        }
                    });
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new UNSContentScript();
        });
    } else {
        new UNSContentScript();
    }

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'checkUNSPage') {
            sendResponse({
                isUNSPage: window.location.hostname.startsWith('utopia.'),
                url: window.location.href
            });
        }
    });

})();
