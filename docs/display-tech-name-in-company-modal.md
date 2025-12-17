# Walkthrough - Display Technology Name in Company Modal

I have updated the company modal popup to display the actual name of the technology instead of its identifier in the ratings list.

## Changes

### 1. Data Helper
Added a helper function `getTechnology` to `js/data.js` to look up technology details by identifier, including fallback to custom technologies.

### 2. UI Update
Modified `js/ui/modals.js` to use this helper. The ratings list now renders the technology name.

## Verification Results

### Automated Tests
* None applicable for this UI change.

### Manual Verification
To verify the fix:
1.  Open the Tech Radar.
2.  Click on a company name to open the company details modal.
3.  Scroll down to the "Beoordelingen" (Ratings) section.
4.  Confirm that the titles of the ratings now show the full technology name (e.g. "Bruno", "Podman") instead of the internal identifier (e.g. "bruno", "podman").
