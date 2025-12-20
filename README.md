**Conclusion Tech Radar**

- **What it is:** A client-side interactive Technology Radar visualization showing technologies, their categories, and ratings by company and phase. Users can filter by category, phase (rings), company/domain, and tags, drill down by double-clicking labels, and view details in a modal.

- **Dynamic Radar Visualization:** Interactive D3.js radar that scales blips and font sizes automatically based on density. Sparse radars get larger, more readable blips.
- **Advanced Filtering:** Filter by categories, phases (rings), companies (grouped by domain), tags, and date.
- **Company Legend:** Interactive visual list of companies on the right, sorted by impact (blip count). Hover to highlight blips; double-click to filter.
- **Logo Support:** Toggleable option to show technology or company logos directly on radar blips for quick recognition.
- **Individual Radar Mode:** Specialized view for personal evaluations from colleagues, featuring a dedicated phase model and simplified presentation. Read more in the [Individual Radar Walkthrough](docs/individual-radar-walkthrough.md).
- **Radar Optimization:** A one-click "Optimize" button that hides empty sectors and uses a polar grid layout to maximize space and prevent overlaps.
- **Local Ratings & Rich Text:** Authenticated users can manage personal ratings locally using a built-in Markdown (EasyMDE) editor.
- **Drill-Down Navigation:** Double-click any category or phase label to instantly focus the radar on that specific segment or ring.
- **Localization:** Full support for English and Dutch with dynamic translation switching.
- **Comprehensive Docs:** Detailed documentation is available in the [User Guide](docs/user-guide.md).

**Authentication (Microsoft Entra ID / MSAL)**
- The app includes an optional Microsoft Entra ID (Azure AD / MSAL) sign-in flow using `msal-browser` (popup flow). A `Sign in` button appears in the header when unauthenticated; after sign-in the header shows `Sign out` and a short welcome message with the authenticated user's display name.
- Configuration: provide your Entra app `clientId` and any required scopes in `js/authConfig.js` (or within `js/auth.js` if you prefer). The authentication uses popup flow and reads basic profile info (displayName/email) from Microsoft Graph on successful sign-in.
- Important: MSAL popup flow requires serving the site over HTTP(S) (not file://). Run a local server before testing authentication.

**Technology & Files**
- Pure static app: HTML, CSS and vanilla ES modules (no build step required).
- Third-party libraries: D3.js and MSAL (msal-browser) — both loaded via CDN in `index.html`.

Main source files
- `index.html` — app shell and UI layout.
- `css/style.css` — application styles and theme variables.
- `js/main.js` — app bootstrap (initialize i18n, data, UI and radar) and auth bootstrap.
- `js/auth.js` — MSAL wrapper for sign-in/sign-out and token/profile retrieval.
- `js/data.js` — loads JSON data, manages filter state, and handles local ratings merging.
- `js/ui/` — Directory containing UI modules:
  - `index.js` — Main UI entry point.
  - `filters.js` — Sidebar filter rendering.
  - `modals.js` — Modal management.
  - `events.js` — Event handling and initialization.
  - `localRatingsUI.js` — UI for local ratings management.
  - `helpers.js` — UI utility functions.
- `js/radar.js` — Main entry point for radar visualization.
- `js/radar/` — Directory containing radar modules:
  - `radar-colors.js` — Color management.
  - `radar-legend.js` — Company legend rendering.
  - `radar-layout.js` — Blip positioning and layout logic.
- `js/i18n.js`, `js/locales/en.js`, `js/locales/nl.js` — localization helpers and translation files.

Data files
- `data/ratings.json` — core ratings and blip definitions used to plot the radar.
- `data/technologies.json` — supporting metadata about technologies (if present).
- `data/companies.json` — company metadata (name, domain, logo, homepage).

Session / Local storage keys
- `sessionStorage.radarCategoryColors` — saved category → color map for the session.
- `sessionStorage.radarCompanyColors` — saved company → color map for the session.
- `localStorage.theme` — persisted theme (`dark`/`light`).
- `localStorage.radarLocalRatings` — locally stored user ratings.

Running locally
- No build step required. Serve the repository root over a static HTTP server and open `index.html` in your browser.

Quick options (PowerShell / Windows):

```powershell
# Option A: Python simple HTTP server (Python 3+)
python -m http.server 8000
# Then open http://localhost:8000 in your browser

# Option B: Using Node (if you have npm)
npx http-server -p 8080
# or
npx serve -s . -l 5000
```

Notes & development
- The app communicates between modules using `CustomEvent` events (e.g., `filter-category`, `filter-phase`, `open-modal`, `language-changed`).
- **Proportional Ring Widths:** Ring widths are calculated proportionally based on the number of blips they contain. Rings with more blips (like "adopt") are wider, while rings with fewer blips (like "hold" and "deprecate") are narrower. A minimum width constraint (10% of radius) ensures all rings remain visible. The algorithm normalizes ring widths to fit within the total radar radius.
- The radar layout computes ring spacing from the active phases returned by `js/data.js` so hiding phases compresses the rings.
- Blips are rendered as domain-shaped symbols (square/triangle/diamond/star/circle) and companies within the same domain share the same symbol shape. Company colors are assigned and persisted for the browser session.
- Double-click a company name in the sidebar to open the company modal which shows description, domain, logo, homepage link and a breakdown of ratings counts per category as well as the listing of ratings tied to that company.
- Companies listed in `data/companies.json` are shown in the filter panel even if `data/ratings.json` contains no ratings for them.
- Authentication UI: `Sign in` is shown when `APP_STATE.authenticated === false`. On successful login the app sets `APP_STATE.authenticated = true`, shows `Sign out`, and displays the user's display name in the header. The UI functions that control this are in `js/ui.js` (`showAuthenticatedUser()` / `showUnauthenticatedState()`).
- To change translations, edit `js/locales/en.js` and `js/locales/nl.js`, then switch using the language selector in the header.
- **Rich Text Editing:** The local ratings "comment" field uses **EasyMDE** for a rich text experience. It supports standard Markdown syntax like headings, lists, and links.
- **Dynamic Blip Sizing:** To improve legibility, the radar automatically adjusts blip radii (6px to 12px) and font sizes (10px to 14px) based on the current blip density. This ensures that when filters are applied and fewer blips remain, the visualization scales up to fill the space effectively.

**Version Management**
The application uses a recognizable version label (e.g., "Robust Glacier") which is visible in the UI. This version is generated based on the current Git commit hash.

To update the version label (typically before a commit or deployment), run:
```bash
node scripts/update-version.js
```
This script will:
1. Get the short Git hash of the current HEAD.
2. Generate a unique name using an adjective and a noun.
3. Update `js/version.js` with the new version details.

Testing & verification
- After starting a static server, exercise the UI: toggle filters, double-click company tags to open modals, check that companies without ratings appear in the company list, sign in and sign out using the header buttons and verify that the welcome message displays your name.

Contributing
- This is a simple static app — open a PR with changes to JS/CSS or data files. Keep changes focused and add small tests or usage notes to this README when adding features.

License
- No license file is included in this repository by default. Add one if you plan to publish.
