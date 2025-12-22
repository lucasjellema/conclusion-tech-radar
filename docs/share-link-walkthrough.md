# Share Link Feature Walkthrough

## Overview

The **Share Link** feature allows users to generate and share a URL that captures the current state of the radar, including all active filters. When someone opens the shared link, they will see the exact same view with the same filters applied.

## Feature Location

The **Share Link** button is located at the bottom of the filter sidebar, below the Visibility controls section.

## How It Works

### Generating a Shareable Link

1. **Apply Filters**: Configure the radar view by selecting:
   - Companies (in Companies Radar mode)
   - Categories
   - Phases (rings)
   - Tags
   - Search terms
   - Date filters
   - Radar mode (Companies or Individual)

2. **Click Share Link**: Press the "Share Link" button at the bottom of the sidebar.

3. **Link Copied**: The button will briefly change to show "Link copied to clipboard!" with a green background for 2 seconds, confirming the action.

4. **Share**: Paste the link anywhere (email, chat, documentation) to share your current radar view.

### What Gets Captured

The shareable link includes URL query parameters for:

- **`mode`**: The current radar mode (`companies` or `individual`)
- **`company`**: Selected companies (only if a subset is selected)
- **`category`**: Selected categories (only if a subset is selected)
- **`phase`**: Selected phases/rings (only if a subset is selected)
- **`tag`**: Selected tags (if any)
- **`search`**: Search query text (if any)
- **`date`**: Date filter (if set)

**Note**: If all items in a filter group are selected (e.g., all companies), that parameter is omitted from the URL to keep it concise.

### Opening a Shared Link

When someone opens a shared link:

1. The application loads normally
2. URL parameters are parsed and applied automatically
3. The radar renders with the exact filter configuration from the link
4. Users can then modify filters as needed or reset to defaults

## Technical Implementation

### Key Components

**`js/data.js`**:
- `getShareableLink()`: Generates the URL with current filter state
- `applyUrlFilters(searchParams)`: Parses and applies URL parameters on load

**`js/ui/events.js`**:
- Event listener for the Share Link button
- Clipboard API integration with fallback for older browsers
- Visual feedback mechanism

**`index.html`**:
- Share Link button in the sidebar

**Localization**:
- `filter.share_link`: Button label
- `filter.link_copied`: Success message

### URL Parameter Examples

**Filtered by specific companies**:
```
?company=Conclusion%20Xforce&company=Conclusion%20Mission%20Critical
```

**Filtered by category and phase**:
```
?category=AI&phase=adopt&phase=trial
```

**Individual radar mode with search**:
```
?mode=individual&search=kubernetes
```

**Complex filter combination**:
```
?mode=companies&company=Netvlies&category=Tools&category=Platform&phase=adopt&search=cloud&date=2024-01-01
```

## Browser Compatibility

The feature uses the modern **Clipboard API** (`navigator.clipboard.writeText`) with a fallback to the legacy `document.execCommand('copy')` method for older browsers or non-HTTPS contexts.

### Supported Browsers
- Chrome/Edge 63+
- Firefox 53+
- Safari 13.1+
- Older browsers via fallback method

## Use Cases

1. **Collaboration**: Share a specific filtered view with colleagues for discussion
2. **Documentation**: Include links in reports or presentations showing specific technology subsets
3. **Bookmarking**: Save personal views for quick access later
4. **Training**: Create curated views for onboarding or educational purposes
5. **Analysis**: Share filtered views highlighting specific domains or technology categories

## Limitations

- The link captures filter state only, not visual settings like zoom level or optimization mode
- Very long URLs (with many filters) may be truncated by some systems
- Shared links assume the same data is available on the target system

## Future Enhancements

Potential improvements could include:
- Short URL generation for complex filter combinations
- Named/saved filter presets
- QR code generation for mobile sharing
- Social media integration
