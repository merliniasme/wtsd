import { useState, useEffect, useCallback, useRef, Dispatch, SetStateAction } from 'react';
import { Word, SyncStatus } from '../types';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  googleSignOut,
  getAccessToken,
  clearCachedToken,
  AuthListenerState,
} from '../utils/googleAuth';
import {
  findDriveBackupFile,
  uploadBackupToDrive,
  downloadBackupFromDrive,
  DriveFileInfo,
  DriveApiError,
} from '../utils/googleDrive';
import { deduplicateWords, cleanupLegacyLocalStorage } from '../utils/storage';
import {
  getLocalDatabase,
  saveLocalDatabase,
  clearLocalDatabase,
} from '../utils/localDb';

interface UseGoogleDriveSyncProps {
  words: Word[];
  setWords: Dispatch<SetStateAction<Word[]>>;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useGoogleDriveSync({
  words,
  setWords,
  addToast,
}: UseGoogleDriveSyncProps) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isTokenExpired, setIsTokenExpired] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [cloudFileInfo, setCloudFileInfo] = useState<DriveFileInfo | null>(null);
  const [cloudWordCount, setCloudWordCount] = useState<number | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isOperating, setIsOperating] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Ref to track latest words without stale closures
  const wordsRef = useRef<Word[]>(words);
  wordsRef.current = words;

  // Refs for auto-sync debounce & lifecycle control
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialSyncDoneRef = useRef(false);
  const isSyncInProgressRef = useRef(false);

  // Helper to get valid access token
  const getValidToken = useCallback(async (): Promise<string | null> => {
    let token = accessToken;
    if (!token) {
      token = await getAccessToken();
    }
    if (token) {
      setAccessToken(token);
      return token;
    }
    return null;
  }, [accessToken]);

  /**
   * Core Automatic Synchronization Engine:
   * "database with newer timestamp would always overwrite db with older timestamp"
   */
  const executeSynchronization = useCallback(
    async (token: string): Promise<boolean> => {
      if (isSyncInProgressRef.current) return false;

      try {
        isSyncInProgressRef.current = true;
        setIsOperating(true);
        setSyncStatus('syncing');

        // 1. Read latest local database record
        const localRecord = getLocalDatabase();
        const localTimestamp = localRecord?.updatedAt || 0;
        const currentLocalWords = localRecord?.words || wordsRef.current;

        // 2. Find cloud database backup file on Google Drive
        const fileInfo = await findDriveBackupFile(token);
        setCloudFileInfo(fileInfo);

        if (fileInfo?.id) {
          // 3. Download cloud database to inspect cloud timestamp
          const download = await downloadBackupFromDrive(token, fileInfo.id);
          const cleanCloudWords = deduplicateWords(download.words);
          const cloudTimestamp = download.lastModified || new Date(fileInfo.modifiedTime).getTime() || 0;

          if (cloudTimestamp > localTimestamp) {
            // Cloud has newer timestamp: Overwrite local database with cloud database
            console.log(
              `[Auto-Sync] Cloud timestamp (${cloudTimestamp}) > Local (${localTimestamp}). Overwriting local database with cloud data.`
            );
            saveLocalDatabase(cleanCloudWords, cloudTimestamp);
            setWords(cleanCloudWords);
            setCloudWordCount(cleanCloudWords.length);
            setLastSyncedAt(new Date(cloudTimestamp));
            setSyncStatus('synced');
            setLastError(null);
            setIsTokenExpired(false);
          } else if (localTimestamp > cloudTimestamp) {
            // Local has newer timestamp: Overwrite cloud database with local database
            console.log(
              `[Auto-Sync] Local timestamp (${localTimestamp}) > Cloud (${cloudTimestamp}). Overwriting cloud database with local data.`
            );
            const cleanLocal = deduplicateWords(currentLocalWords);
            const updatedInfo = await uploadBackupToDrive(token, cleanLocal, localTimestamp);
            setCloudFileInfo(updatedInfo);
            setCloudWordCount(cleanLocal.length);
            setLastSyncedAt(new Date(localTimestamp));
            setSyncStatus('synced');
            setLastError(null);
            setIsTokenExpired(false);
          } else {
            // Timestamps are identical: already in sync
            setCloudWordCount(cleanCloudWords.length);
            setLastSyncedAt(new Date(localTimestamp));
            setSyncStatus('synced');
            setLastError(null);
            setIsTokenExpired(false);
          }
        } else {
          // Cloud backup file does not exist yet: push local database to cloud
          const cleanLocal = deduplicateWords(currentLocalWords);
          const now = localTimestamp > 0 ? localTimestamp : Date.now();
          saveLocalDatabase(cleanLocal, now);
          const newFile = await uploadBackupToDrive(token, cleanLocal, now);
          setCloudFileInfo(newFile);
          setCloudWordCount(cleanLocal.length);
          setLastSyncedAt(new Date(now));
          setSyncStatus('synced');
          setLastError(null);
          setIsTokenExpired(false);
        }

        return true;
      } catch (err: unknown) {
        console.warn('[Auto-Sync] Automatic synchronization error:', err);
        setSyncStatus('error');
        if (err instanceof DriveApiError && err.status === 401) {
          setIsTokenExpired(true);
          clearCachedToken();
          setLastError('Google Drive session expired. Please reconnect.');
        } else {
          const msg = err instanceof Error ? err.message : 'Sync check failed';
          setLastError(msg);
        }
        return false;
      } finally {
        isSyncInProgressRef.current = false;
        setIsOperating(false);
        isInitialSyncDoneRef.current = true;
      }
    },
    [setWords]
  );

  // Initialize Auth & Local Database on mount
  useEffect(() => {
    cleanupLegacyLocalStorage();

    // Bootstrap local database if state is currently empty
    const local = getLocalDatabase();
    if (local && local.words.length > 0 && wordsRef.current.length === 0) {
      setWords(local.words);
    }

    const unsubscribe = initAuth((state: AuthListenerState) => {
      setIsAuthLoading(state.isLoading);
      setUser(state.user);

      if (state.user && state.token && !state.isExpired) {
        setAccessToken(state.token);
        setIsTokenExpired(false);
        // Execute automatic sync on startup / authentication
        executeSynchronization(state.token);
      } else if (state.user && (state.isExpired || !state.token)) {
        setAccessToken(null);
        setIsTokenExpired(true);
        setSyncStatus('error');
        setLastError('Saved login token expired. Please reconnect.');
      } else {
        setAccessToken(null);
        setIsTokenExpired(false);
        setCloudFileInfo(null);
        setCloudWordCount(null);
        setSyncStatus('idle');
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [executeSynchronization, setWords]);

  // Sign In Handler
  const handleSignIn = async () => {
    setIsSigningIn(true);
    setLastError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setIsTokenExpired(false);
        addToast(`Signed in as ${result.user.displayName || result.user.email}`, 'success');
        await executeSynchronization(result.accessToken);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      setLastError(msg);
      setSyncStatus('error');
      addToast(`Sign in error: ${msg}`, 'error');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Sign Out Handler
  const handleSignOut = async () => {
    try {
      await googleSignOut();
      setUser(null);
      setAccessToken(null);
      setIsTokenExpired(false);
      setCloudFileInfo(null);
      setCloudWordCount(null);
      setSyncStatus('idle');
      clearLocalDatabase();
      setWords([]);
      isInitialSyncDoneRef.current = false;
      addToast('Signed out.', 'info');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  /**
   * Watch changes in words:
   * 1. Immediately store into local temporary database with new timestamp.
   * 2. Immediately switch sync status to 'unsaved' (yellow indicator).
   * 3. Automatically sync to cloud after 600ms debounce.
   */
  useEffect(() => {
    // If words changed, immediately save to local temporary database
    const now = Date.now();
    saveLocalDatabase(words, now);

    // If initial startup sync hasn't run yet, don't trigger cloud save
    if (!isInitialSyncDoneRef.current) {
      return;
    }

    // Set indicator to yellow (unsaved / syncing pending)
    setSyncStatus('unsaved');

    if (!user || isTokenExpired) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      const token = await getValidToken();
      if (token) {
        await executeSynchronization(token);
      } else {
        setSyncStatus('error');
      }
    }, 600);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [words, user, isTokenExpired, getValidToken, executeSynchronization]);

  // Periodic and on-focus auto-sync check
  useEffect(() => {
    const handleFocus = async () => {
      if (user && !isTokenExpired && isInitialSyncDoneRef.current) {
        const token = await getValidToken();
        if (token) {
          executeSynchronization(token);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
    };
  }, [user, isTokenExpired, getValidToken, executeSynchronization]);

  // Reset Cloud Database & Local Database to Empty
  const clearCloudDatabase = useCallback(async () => {
    clearLocalDatabase();
    setWords([]);

    const token = await getValidToken();
    if (!token || !user) {
      addToast('Dictionary cleared.', 'info');
      setSyncStatus('synced');
      return;
    }

    try {
      setIsOperating(true);
      setSyncStatus('syncing');
      const now = Date.now();
      saveLocalDatabase([], now);
      const info = await uploadBackupToDrive(token, [], now);
      setCloudFileInfo(info);
      setCloudWordCount(0);
      setLastSyncedAt(new Date(now));
      setSyncStatus('synced');
      addToast('Google Drive dictionary reset to 0 words.', 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reset failed';
      setLastError(msg);
      setSyncStatus('error');
      addToast(`Reset error: ${msg}`, 'error');
    } finally {
      setIsOperating(false);
    }
  }, [addToast, getValidToken, setWords, user]);

  // Manual retry trigger in case user wants to re-attempt after an error
  const retrySync = useCallback(async () => {
    const token = await getValidToken();
    if (!token || !user || isTokenExpired) {
      await handleSignIn();
      return;
    }
    await executeSynchronization(token);
  }, [getValidToken, user, isTokenExpired, executeSynchronization]);

  return {
    user,
    accessToken,
    isAuthLoading,
    isTokenExpired,
    syncStatus,
    lastSyncedAt,
    cloudFileInfo,
    cloudWordCount,
    isSigningIn,
    isOperating,
    lastError,
    signIn: handleSignIn,
    signOut: handleSignOut,
    retrySync,
    clearCloudDatabase,
  };
}



