import { loadData } from './data.js';
import { initRadar, updateRadar } from './radar.js';
//import { initUI } from './ui.js';
import * as ui from './ui.js';
import { initI18n, setLocale, translatePage, t } from './i18n.js';
import * as auth from './auth.js';


// Constants for application state
const APP_STATE = {
  initialized: false,
  authenticated: false
};

async function init() {
    try {
        // Initialize i18n first so static labels are translated before UI builds
        initI18n();

        // Wire language selector to change locale and notify UI modules
        const langSelect = document.getElementById('lang-select');
        if (langSelect) {
            langSelect.addEventListener('change', (e) => {
                setLocale(e.target.value);
                // Notify other modules to refresh dynamic text
                document.dispatchEvent(new CustomEvent('language-changed'));
            });
        }


        const data = await loadData();
        console.log('Data loaded:', data);

        initRadar(data);
        ui.initUI(data, updateRadar);

// Authentication related initialization
  // Add MSAL script to the page if not present
  await ensureMsalLoaded();

  // Initialize the authentication module
  APP_STATE.initialized = auth.initializeAuth();

  if (!APP_STATE.initialized) {
    ui.showError("Failed to initialize authentication system");
    return;
  }

  // Set up UI with auth callbacks and admin functionality
  ui.initializeUI(handleSignIn, handleSignOut);


  // Check for authentication event
  // Add MSAL login success listener, broadcast from auth.js
  window.addEventListener('msalLoginSuccess', async (event) => {
    console.log('MSAL Login Success Event:', event.detail);
    // Update UI or perform actions after successful login
    const { account } = event.detail.payload;
    if (account) {
      console.log(`User ${account.username} logged in successfully`);
      console.log("Successful authentication response received");
      await updateUserState();
    }
  })
  
  //   // Check if user is already signed in
  await checkExistingAuth();


        // Authentication UI is handled by `ui.initializeUI(handleSignIn, handleSignOut)`
        // and the auth module events (`msalLoginSuccess`) which call `updateUserState()`.
        // The legacy `login-btn` wiring was removed to avoid duplicate/contradictory handlers.

    } catch (error) {
        console.error('Failed to initialize application:', error);
    }
}

/**
 * Ensure MSAL script is loaded before proceeding
 */
async function ensureMsalLoaded() {
  // Check if MSAL is already available
  if (window.msal) {
    return;
  }

  return new Promise((resolve) => {
    // Create script tag for MSAL
    const msalScript = document.createElement('script');
    msalScript.src = "https://alcdn.msauth.net/browser/2.30.0/js/msal-browser.min.js";
    msalScript.async = true;
    msalScript.defer = true;

    // Handle script load event
    msalScript.onload = () => {
      console.log("MSAL.js loaded successfully");
      resolve();
    };

    // Handle script error
    msalScript.onerror = () => {
      console.error("Failed to load MSAL.js");
      ui.showError("Failed to load authentication library");
      resolve(); // Resolve anyway to allow error handling
    };

    // Add the script to the document head
    document.head.appendChild(msalScript);
  });
}

/**
 * Check if user is already authenticated
 */
async function checkExistingAuth() {
  const account = auth.getAccount();
  if (account) {
    console.log("Found existing account", account.username);
    await updateUserState();
  } else {
    // No account found, show unauthenticated state
    APP_STATE.authenticated = false;
    ui.showUnauthenticatedState();
  }
}

async function updateUserState() {
  try {
    // Get user details from Microsoft Graph API
    const userDetails = await auth.getUserDetails();

    if (userDetails) {
      APP_STATE.authenticated = true;

      // Get ID token claims for display
      const idTokenClaims = auth.getIdTokenClaims();

      // Update UI with user details and token claims
      ui.showAuthenticatedUser(userDetails, idTokenClaims);

    } else {
      APP_STATE.authenticated = false;
      ui.showUnauthenticatedState();
    }
  } catch (error) {
    console.error("Error updating user state:", error);
    APP_STATE.authenticated = false;
    ui.showUnauthenticatedState();
  }
}

/**
 * Handle sign-in button click
 */
function handleSignIn() {
  if (!APP_STATE.initialized) {
    ui.showError("Authentication system not initialized");
    return;
  }

  try {
    auth.signIn();
  } catch (error) {
    console.error("Sign in error:", error);
    ui.showError("Failed to sign in");
  }
}

/**
 * Handle sign-out button click
 */
function handleSignOut() {
  if (!APP_STATE.initialized) {
    return;
  }

  try {
    auth.signOut();
    APP_STATE.authenticated = false;
    ui.showUnauthenticatedState();
  } catch (error) {
    console.error("Sign out error:", error);
    ui.showError("Failed to sign out");
  }
}



document.addEventListener('DOMContentLoaded', init);
