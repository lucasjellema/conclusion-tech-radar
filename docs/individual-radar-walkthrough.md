# Walkthrough - Individual Radar Mode

I have implemented a new "Individual" mode for the technology radar, allowing users to view personal ratings from colleagues.

## Key Features

### 1. New Radar Mode Selection
Users can now switch between "Companies Radar" and "Colleagues Radar" using the new tabs at the top of the main content area.

### 2. Specialized Phases
The "Colleagues Radar" uses a different set of phases:
- **Pre-assess**
- **Personal Assess**
- **Personal Use**
- **Hold**

### 3. Individual-Focused UI
In Individual mode:
- The "Companies" filter section in the sidebar is hidden.
- The domain legend and company legend on the radar are hidden.
- Blips are rendered as simple circles, as company domains are not applicable.
- Hovering over a blip or opening its modal shows the professional's name instead of a company name.

### 4. Dynamic Phase Selection in Local Ratings
The "Add/Edit Rating" modal in the **Manage Ratings** tab now dynamically updates the available phases:
- If the **Company** field is empty, it shows individual phases (*Pre-assess, Personal Assess, Personal Use, Hold*).
- If the **Company** field has a value, it shows company phases (*Adopt, Trial, Assess, Hold, Deprecate*).
- This ensures that local ratings are always created with the correct phase set for their type.

## Implementation Details

### Data Filtering
The system now detects individual ratings by the absence of the `bedrijf` property. `js/data.js` handles the filtering and provides mode-specific phase ordering.

### Robust Radar Rendering
- **D3 Layout Fix**: Added a filter in `js/radar.js` to ensure only blips with valid coordinates are rendered, preventing the "Expected number" error.
- **Typo Correction**: Fixed "pre-asses" to "pre-assess" across `js/data.js` and locale files to ensure consistent phase mapping.
- **Layout Safety**: Updated `js/radar/radar-layout.js` to provide console warnings when blips are skipped due to mismatched data.
