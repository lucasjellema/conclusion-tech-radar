# Walkthrough - Fixed User Name Display

I have updated the code to correctly display the user's name after login.

## Changes

### User Interface

#### [modify] [localRatingsUI.js](file:///c:/research/conclusion-tech-radar/js/ui/localRatingsUI.js)
- Updated `showAuthenticatedUser` to use `userDetails.displayName` instead of `userDetails.name`.

## Verification Results

### Manual Verification
- Verified that the property accessed `userDetails.displayName` matches the standard Microsoft Graph API response for user details.
