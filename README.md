**Conclusion Tech Radar**

- **What it is:** A client-side interactive Technology Radar visualization showing technologies, their categories, and ratings by company and phase. Users can filter by category, phase (rings), company/domain, and tags, drill down by double-clicking labels, and view details in a modal.

**Key Features**
- Interactive radar visualization with D3.js.
- Filters for categories, phases (rings), companies (grouped by domain), and tags.
- **Company Legend:** Visual list of companies on the right, sorted by blip count. Hover to highlight.
- **Radar Optimization:** "Optimize" button to hide empty sectors and improve blip distribution using a polar grid layout.
- **Local Ratings:** Authenticated users can create and manage their own ratings locally via the "Manage Ratings" tab.
- Drill-down by double-clicking category or phase labels.
- Sidebar with resizable width and collapsible sections.
- Session-sticky color mapping for categories and companies.
- EN/NL localization and dynamic UI translations.
- Company details modal: double-click a company tag in the sidebar or legend to open a modal with details.
- Companies without ratings are now included in the company filter panel.

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
- `js/ui.js` — renders filters, sidebar interactions, modal, and event wiring.
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
- The radar layout computes ring spacing from the active phases returned by `js/data.js` so hiding phases compresses the rings.
- Blips are rendered as domain-shaped symbols (square/triangle/diamond/star/circle) and companies within the same domain share the same symbol shape. Company colors are assigned and persisted for the browser session.
- Double-click a company name in the sidebar to open the company modal which shows description, domain, logo, homepage link and a breakdown of ratings counts per category as well as the listing of ratings tied to that company.
- Companies listed in `data/companies.json` are shown in the filter panel even if `data/ratings.json` contains no ratings for them.
- Authentication UI: `Sign in` is shown when `APP_STATE.authenticated === false`. On successful login the app sets `APP_STATE.authenticated = true`, shows `Sign out`, and displays the user's display name in the header. The UI functions that control this are in `js/ui.js` (`showAuthenticatedUser()` / `showUnauthenticatedState()`).
- To change translations, edit `js/locales/en.js` and `js/locales/nl.js`, then switch using the language selector in the header.

Testing & verification
- After starting a static server, exercise the UI: toggle filters, double-click company tags to open modals, check that companies without ratings appear in the company list, sign in and sign out using the header buttons and verify that the welcome message displays your name.

Contributing
- This is a simple static app — open a PR with changes to JS/CSS or data files. Keep changes focused and add small tests or usage notes to this README when adding features.

License
- No license file is included in this repository by default. Add one if you plan to publish.
