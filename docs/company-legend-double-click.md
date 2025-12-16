# Walkthrough - Company Legend Double Click

I have implemented the requested double-click behavior for the company legend.

## Changes

### 1. Data Logic (`js/data.js`)
Added `setExclusiveCompany` function to support filtering by a single company while clearing other company filters.

### 2. UI Logic (`js/ui.js`)
Added an event listener for `filter-company` which triggers the new `setExclusiveCompany` function (or toggles back to "All" if already selected).

### 3. Legend Interaction (`js/radar/radar-legend.js`)
Refactored the click handling for legend items:
-   **Single Click**: Now has a 250ms delay. Opens the company details popup.
-   **Double Click**: Cancels the single click action and triggers the `filter-company` event, isolating that company on the radar.

## Verification Results

### Manual Verification Steps
1.  **Single Click Test**:
    -   Click on a company name in the legend (e.g., "Conclusion").
    -   **Expected**: After a brief pause, the company popup opens.
2.  **Double Click Test**:
    -   Double-click on a company name in the legend.
    -   **Expected**: The popup does **not** open. The radar updates to show only blips for that company. The sidebar filter also updates to show only that company selected.
3.  **Toggle Back Test**:
    -   Double-click the same company again (or use "All" in the sidebar).
    -   **Expected**: The filter resets to show all companies.
