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

interface StoredTokenPayload {
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
 * Check if the current cached token is expired or about to expire in the next 60 seconds
 */
export const isCachedTokenExpired = (): boolean => {
  if (!cachedTokenData?.token) return true;
  // If expires within 60s, treat as expired
  return Date.now() >= (cachedTokenData.expiresAt - 60 * 1000);
};

// Initialize Auth Listener on App Load with persistent cache restoration
export const initAuth = (
  onAuthChange: (state: AuthListenerState) => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // Check stored token
      const stored = cachedTokenData || (() => {
        try {
          const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
          if (!raw) return null;
          if (raw.startsWith('{')) return JSON.parse(raw) as StoredTokenPayload;
          return { token: raw, expiresAt: Date.now() + 3600 * 1000 };
        } catch {
          return null;
        }
      })();

      if (stored && stored.token) {
        cachedTokenData = stored;
        const expired = Date.now() >= (stored.expiresAt - 60 * 1000);
        onAuthChange({
          user,
          token: stored.token,
          isExpired: expired,
          isLoading: false,
        });
      } else {
        onAuthChange({
          user,
          token: null,
          isExpired: true,
          isLoading: false,
        });
      }
    } else {
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
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
};

// Retrieve cached access token from memory / localStorage
export const getAccessToken = async (): Promise<string | null> => {
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
  return cachedTokenData?.token || null;
};

// Set token in memory and persistent cache
export const setCachedToken = (token: string | null, expiresInSeconds = 3500) => {
  if (token) {
    cachedTokenData = {
      token,
      expiresAt: Date.now() + expiresInSeconds * 1000,
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

