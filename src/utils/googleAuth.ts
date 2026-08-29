import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Google Auth Provider with Google Drive Scopes
export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// Set custom parameters to ensure prompt selection if needed
provider.setCustomParameters({
  prompt: 'select_account',
});

// Internal auth state tracking
let isSigningIn = false;
let cachedAccessToken: string | null = (() => {
  try {
    return sessionStorage.getItem('gdrive_session_token');
  } catch {
    return null;
  }
})();

export interface GoogleAuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

// Initialize Auth Listener on App Load
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // Try reading session token
        try {
          const sessionToken = sessionStorage.getItem('gdrive_session_token');
          if (sessionToken) {
            cachedAccessToken = sessionToken;
            if (onAuthSuccess) onAuthSuccess(user, sessionToken);
            return;
          }
        } catch {
          // ignore
        }
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      try {
        sessionStorage.removeItem('gdrive_session_token');
      } catch {
        // ignore
      }
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google Popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Drive access token.');
    }

    cachedAccessToken = credential.accessToken;
    try {
      sessionStorage.setItem('gdrive_session_token', credential.accessToken);
    } catch {
      // ignore
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Retrieve in-memory access token
export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken) {
    try {
      cachedAccessToken = sessionStorage.getItem('gdrive_session_token');
    } catch {
      // ignore
    }
  }
  return cachedAccessToken;
};

// Set token in memory (e.g. if refreshed)
export const setCachedToken = (token: string | null) => {
  cachedAccessToken = token;
  try {
    if (token) {
      sessionStorage.setItem('gdrive_session_token', token);
    } else {
      sessionStorage.removeItem('gdrive_session_token');
    }
  } catch {
    // ignore
  }
};

// Google Sign out
export const googleSignOut = async () => {
  try {
    await signOut(auth);
  } finally {
    cachedAccessToken = null;
    try {
      sessionStorage.removeItem('gdrive_session_token');
    } catch {
      // ignore
    }
  }
};
