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
const TOKEN_STORAGE_KEY = 'whos_the_spy_gdrive_token';

// Internal in-memory and cached token access
let cachedAccessToken: string | null = (() => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
})();

export interface GoogleAuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

// Initialize Auth Listener on App Load with persistent cache restoration
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const storedToken =
        cachedAccessToken ||
        (() => {
          try {
            return localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY);
          } catch {
            return null;
          }
        })();

      if (storedToken) {
        cachedAccessToken = storedToken;
        if (onAuthSuccess) onAuthSuccess(user, storedToken);
      } else {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch {
        // ignore
      }
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google Popup and cache access token to localStorage
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Drive access token.');
    }

    cachedAccessToken = credential.accessToken;
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, credential.accessToken);
    } catch {
      // fallback
      try {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, credential.accessToken);
      } catch {
        // ignore
      }
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
};

// Retrieve cached access token from memory / localStorage
export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken) {
    try {
      cachedAccessToken =
        localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  return cachedAccessToken;
};

// Set token in memory and persistent cache
export const setCachedToken = (token: string | null) => {
  cachedAccessToken = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
};

// Google Sign out and clear cached credentials
export const googleSignOut = async () => {
  try {
    await signOut(auth);
  } finally {
    cachedAccessToken = null;
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
};
