# UNS Chrome Extension

A professional Chrome extension for the Utopia Naming System (UNS) that automatically resolves `utopia.*` addresses to their actual destinations.

## Features

### 🔍 **Smart Resolution**
- Automatically intercepts and resolves `utopia.*` URLs
- Multi-registry support with fallback mechanisms
- Intelligent caching with configurable TTL
- Real-time resolution status and statistics

### 🎨 **Beautiful Interface**
- Modern glassmorphism design with gradient backgrounds
- Intuitive popup with live statistics
- Comprehensive settings page with tabbed interface
- Visual indicators for UNS links on web pages

### ⚡ **Advanced Functionality**
- Context menu integration for selected UNS addresses
- Recent resolutions history with quick access
- Export/import settings and data
- Debug mode for troubleshooting
- Customizable fallback behavior

### 🛡️ **Security & Privacy**
- All resolution happens locally in your browser
- No data sent to third parties
- Configurable registry endpoints
- Optional notifications and tracking

## Installation

### Method 1: Load Unpacked (Development)

1. **Clone or download** the UNS repository
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top-right corner)
4. **Click "Load unpacked"** and select the `browser-extension` folder
5. **Create icon files** (see Icon Setup below)
6. The extension should now appear in your toolbar! 🎉

### Method 2: Chrome Web Store (Coming Soon)
The extension will be published to the Chrome Web Store once it's production-ready.

## Icon Setup

Since we can't include binary icon files in the repository, you'll need to create simple icon files:

1. Create PNG files in the `browser-extension/icons/` folder:
   - `icon16.png` (16x16 pixels)
   - `icon32.png` (32x32 pixels) 
   - `icon48.png` (48x48 pixels)
   - `icon128.png` (128x128 pixels)

2. **Simple approach**: Create a blue square with white "🌍" or "U" text
3. **Design approach**: Use the UNS brand colors (gradient from #667eea to #764ba2)

You can use online tools like:
- [Canva](https://canva.com) - Create simple designs
- [Favicon.io](https://favicon.io) - Generate icon sets
- [GIMP](https://gimp.org) - Open source image editor

## Configuration

### Basic Settings
- **Enable UNS Resolver**: Turn the extension on/off
- **Auto-redirect**: Automatically navigate to resolved addresses
- **Show notifications**: Display resolution status notifications

### Performance Settings
- **Cache TTL**: How long to cache resolved addresses (default: 1 hour)
- **Request timeout**: Maximum time to wait for registry responses (default: 10 seconds)

### Registry Configuration
Configure which registries to query for UNS resolution:
- Default: `https://registry.utopia.network` and `https://dht.uns.org`
- Add custom registries for private networks
- Reorder registries by priority

### Advanced Settings
- **Debug mode**: Enable detailed logging for troubleshooting
- **Custom User-Agent**: Override browser identification for registry requests
- **Fallback behavior**: What to do when addresses cannot be resolved

## Usage

### Automatic Resolution
1. **Type a UNS address** in your browser: `utopia.dillanet//.obsidiannotes`
2. **Press Enter** - the extension automatically intercepts the request
3. **Get redirected** to the resolved destination seamlessly

### Manual Resolution
1. **Click the extension icon** in your toolbar
2. **Enter a UNS address** in the test field
3. **Click "Resolve"** to see the result
4. **Click "Visit Site"** to navigate to the resolved address

### Context Menu
1. **Select a UNS address** on any web page
2. **Right-click** and choose "Resolve UNS Address"
3. **The address opens** in a new tab automatically

## Troubleshooting

### Extension Not Working
- Check that Developer Mode is enabled in `chrome://extensions/`
- Ensure all icon files are present in the `icons` folder
- Check browser console for error messages
- Try reloading the extension

### Resolution Failures
- Verify the UNS address format: `utopia.<network>//<path>`
- Check that registries are accessible in extension options
- Enable debug mode to see detailed resolution logs
- Clear extension cache and try again

### Performance Issues
- Reduce cache TTL if addresses change frequently
- Remove slow or unresponsive registries
- Check network connectivity to registry endpoints
- Monitor resolution statistics in the popup

## Development

### File Structure
```
browser-extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for request interception
├── popup.html/js          # Extension popup interface
├── options.html/js        # Settings page
├── content.js             # Page enhancement script
├── icons/                 # Extension icons (16, 32, 48, 128px)
└── README.md             # This file
```

### Key Components

**Background Script (`background.js`)**
- Intercepts `utopia.*` requests
- Manages resolution and caching
- Handles statistics and notifications

**Popup Interface (`popup.html/js`)**
- Quick resolution testing
- Live statistics display
- Recent resolution history
- Cache management

**Options Page (`options.html/js`)**
- Comprehensive settings management
- Registry configuration
- Advanced options and debugging

**Content Script (`content.js`)**
- Enhances UNS links on web pages
- Shows resolution indicators
- Injects helper functions

### Building

The extension is pure HTML/CSS/JavaScript with no build process required. Simply:

1. **Modify the source files** as needed
2. **Reload the extension** in `chrome://extensions/`
3. **Test your changes** immediately

### Contributing

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Test thoroughly**
5. **Submit a pull request**

## Support

- **Issues**: [GitHub Issues](https://github.com/primortalj/Utopia/issues)
- **Discussions**: [GitHub Discussions](https://github.com/primortalj/Utopia/discussions)
- **Documentation**: [Technical Specification](../UNS-Technical-Specification.md)

## License

This extension is part of the Utopia Naming System project and is released under the MIT License.

---

**Happy browsing with UNS! 🌍✨**
