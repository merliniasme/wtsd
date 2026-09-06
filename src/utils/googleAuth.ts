import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Enable persistent authentication across browser closures and sessions
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Could not set auth persistence to browserLocalPersistence:', err);
});

// Google Auth Provider with Google Drive Scopes
export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// Constant key for caching Google Drive access token in browser persistent storage
const TOKEN_STORAGE_KEY = 'whos_the_spy_gdrive_token_v4';

export interface StoredTokenPayload {
  token: string;
  expiresAt: number; // Unix timestamp ms
  userEmail?: string | null;
}

// Internal in-memory and cached token access
let cachedTokenData: StoredTokenPayload | null = (() => {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    if (raw.startsWith('{')) {
      return JSON.parse(raw) as StoredTokenPayload;
    }
    // Backward compatibility with raw token strings: assume 1 hr validity
    return {
      token: raw,
      expiresAt: Date.now() + 3600 * 1000,
    };
  } catch {
    return null;
  }
})();

export interface AuthListenerState {
  user: User | null;
  token: string | null;
  isExpired: boolean;
  isLoading: boolean;
}

/**
 * Check if the current cached token is expired or about to expire in the next 120 seconds
 */
export const isCachedTokenExpired = (): boolean => {
  if (!cachedTokenData?.token) return true;
  // If expires within 120s, treat as expired/expiring
  return Date.now() >= (cachedTokenData.expiresAt - 120 * 1000);
};

// Helper: Ensure Google Identity Services (GIS) client library is loaded
let gsiLoadPromise: Promise<boolean> | null = null;
export const ensureGsiLoaded = (): Promise<boolean> => {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.google?.accounts?.oauth2) return Promise.resolve(true);
  if (gsiLoadPromise) return gsiLoadPromise;

  gsiLoadPromise = new Promise((resolve) => {
    // If script tag already exists
    const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(!!window.google?.accounts?.oauth2));
      existingScript.addEventListener('error', () => resolve(false));
      setTimeout(() => resolve(!!window.google?.accounts?.oauth2), 1500);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(!!window.google?.accounts?.oauth2);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
    setTimeout(() => resolve(!!window.google?.accounts?.oauth2), 3000);
  });

  return gsiLoadPromise;
};

/**
 * Silently requests a refreshed Google OAuth access token using Google Identity Services (GIS).
 * Runs completely in the background without user interaction or popup if the user is signed into Google.
 */
export const requestSilentTokenRefresh = async (userEmail?: string | null): Promise<string | null> => {
  try {
    const isLoaded = await ensureGsiLoaded();
    if (!isLoaded || !window.google?.accounts?.oauth2) {
      return null;
    }

    const targetEmail = userEmail || auth.currentUser?.email || cachedTokenData?.userEmail || undefined;
    const clientId = firebaseConfig.oAuthClientId;
    if (!clientId) {
      return null;
    }

    return new Promise<string | null>((resolve) => {
      try {
        const client = window.google!.accounts!.oauth2!.initTokenClient({
          client_id: clientId,
          scope: SCOPES.join(' '),
          hint: targetEmail,
          prompt: '', // Silent request without showing user prompt/popup
          callback: (response) => {
            if (response.access_token) {
              const expiresIn = Number(response.expires_in) || 3500;
              setCachedToken(response.access_token, expiresIn, targetEmail);
              resolve(response.access_token);
            } else {
              resolve(null);
            }
          },
          error_callback: () => {
            resolve(null);
          },
        });

        client.requestAccessToken({ prompt: '', hint: targetEmail });
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
};

// Periodic background renewal timer
let autoRefreshTimer: ReturnType<typeof setInterval> | null = null;
const startAutoRefreshTimer = () => {
  if (autoRefreshTimer) return;
  // Check and silently renew every 20 minutes while the app is running
  autoRefreshTimer = setInterval(async () => {
    if (auth.currentUser) {
      await requestSilentTokenRefresh(auth.currentUser.email);
    }
  }, 20 * 60 * 1000);
};

const stopAutoRefreshTimer = () => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
};

// Initialize Auth Listener on App Load with persistent cache restoration and auto silent-refresh
export const initAuth = (
  onAuthChange: (state: AuthListenerState) => void
) => {
  // Guarantee local persistence is configured
  setPersistence(auth, browserLocalPersistence).catch(() => {});

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      startAutoRefreshTimer();

      // Check stored token in memory or localStorage
      const stored = cachedTokenData || (() => {
        try {
          const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
          if (!raw) return null;
          if (raw.startsWith('{')) return JSON.parse(raw) as StoredTokenPayload;
          return { token: raw, expiresAt: Date.now() + 3600 * 1000, userEmail: user.email };
        } catch {
          return null;
        }
      })();

      const now = Date.now();
      const isStillValid = stored && stored.token && now < (stored.expiresAt - 60 * 1000);

      if (isStillValid && stored.token) {
        cachedTokenData = stored;
        onAuthChange({
          user,
          token: stored.token,
          isExpired: false,
          isLoading: false,
        });

        // If expires soon (< 10 minutes), trigger silent background refresh proactively
        if (now >= (stored.expiresAt - 10 * 60 * 1000)) {
          requestSilentTokenRefresh(user.email).then((refreshedToken) => {
            if (refreshedToken) {
              onAuthChange({
                user,
                token: refreshedToken,
                isExpired: false,
                isLoading: false,
              });
            }
          });
        }
      } else {
        // Token missing or expired: Attempt silent background refresh first before declaring expired!
        const silentToken = await requestSilentTokenRefresh(user.email);
        if (silentToken) {
          onAuthChange({
            user,
            token: silentToken,
            isExpired: false,
            isLoading: false,
          });
        } else {
          // If silent refresh failed and existing token was past expiry, notify needs reconnect
          onAuthChange({
            user,
            token: null,
            isExpired: true,
            isLoading: false,
          });
        }
      }
    } else {
      stopAutoRefreshTimer();
      cachedTokenData = null;
      try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch {
        // ignore
      }
      onAuthChange({
        user: null,
        token: null,
        isExpired: false,
        isLoading: false,
      });
    }
  });
};

// Sign in with Google Popup and cache access token to localStorage with validity timestamp
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    // Explicitly enforce local persistence before opening the popup
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Drive access token.');
    }

    const payload: StoredTokenPayload = {
      token: credential.accessToken,
      // Google tokens last ~3600 seconds, store expiry for safe re-validation
      expiresAt: Date.now() + 3500 * 1000,
      userEmail: result.user.email,
    };

    cachedTokenData = payload;
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      try {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // ignore
      }
    }

    startAutoRefreshTimer();
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
};

// Retrieve cached access token from memory / localStorage with auto silent-refresh fallback
export const getAccessToken = async (forceRefresh = false): Promise<string | null> => {
  if (!forceRefresh && cachedTokenData?.token && Date.now() < (cachedTokenData.expiresAt - 90 * 1000)) {
    return cachedTokenData.token;
  }

  // If token is missing, expired, or forceRefresh requested, attempt silent refresh
  if (auth.currentUser?.email || cachedTokenData?.userEmail) {
    const refreshed = await requestSilentTokenRefresh(auth.currentUser?.email || cachedTokenData?.userEmail);
    if (refreshed) {
      return refreshed;
    }
  }

  // Fallback to cached token if still within hard validity
  if (!cachedTokenData) {
    try {
      const raw = localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY);
      if (raw) {
        if (raw.startsWith('{')) {
          cachedTokenData = JSON.parse(raw);
        } else {
          cachedTokenData = { token: raw, expiresAt: Date.now() + 3600 * 1000 };
        }
      }
    } catch {
      // ignore
    }
  }

  if (cachedTokenData?.token && Date.now() < cachedTokenData.expiresAt) {
    return cachedTokenData.token;
  }

  return null;
};

// Set token in memory and persistent cache
export const setCachedToken = (token: string | null, expiresInSeconds = 3500, userEmail?: string | null) => {
  if (token) {
    cachedTokenData = {
      token,
      expiresAt: Date.now() + expiresInSeconds * 1000,
      userEmail: userEmail || auth.currentUser?.email || cachedTokenData?.userEmail,
    };
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(cachedTokenData));
    } catch {
      // ignore
    }
  } else {
    cachedTokenData = null;
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
};

// Clear cached credentials without signing out of Firebase completely if desired
export const clearCachedToken = () => {
  cachedTokenData = null;
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
};

// Google Sign out and clear cached credentials
export const googleSignOut = async () => {
  stopAutoRefreshTimer();
  try {
    await signOut(auth);
  } finally {
    cachedTokenData = null;
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
};


