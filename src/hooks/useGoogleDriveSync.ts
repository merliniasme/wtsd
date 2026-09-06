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
import { deduplicateWords, saveActiveWordsToLocal, loadActiveWordsFromLocal } from '../utils/storage';
import { extractAllPairs } from '../utils/wordGraph';

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

  // Track session lastModified timestamp (epoch ms)
  const sessionTimestampRef = useRef<number>(Date.now());

  // Ref to track latest words without stale closures
  const wordsRef = useRef<Word[]>(words);
  wordsRef.current = words;

  // Ref for debounce timer
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadDoneRef = useRef(false);
  const isSavingRef = useRef(false);

  // Helper to get valid access token (with optional force silent-refresh)
  const getValidToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
    let token = accessToken;
    if (!token || forceRefresh) {
      token = await getAccessToken(forceRefresh);
    }
    if (token) {
      setAccessToken(token);
      setIsTokenExpired(false);
      return token;
    }
    return null;
  }, [accessToken]);

  // Execute Automatic Save to Drive with Session Timestamp
  const executeAutoSave = useCallback(
    async (targetWords: Word[], sessionTimestamp: number) => {
      const clean = deduplicateWords(targetWords);
      // Always guarantee local persistence first so no edits are lost
      saveActiveWordsToLocal(clean);

      const token = await getValidToken();
      if (!token || !user) {
        setSyncStatus('unsaved');
        return;
      }

      try {
        isSavingRef.current = true;
        setSyncStatus('syncing');

        let activeToken = token;
        let info: DriveFileInfo;
        try {
          info = await uploadBackupToDrive(activeToken, clean, sessionTimestamp);
        } catch (uploadErr) {
          if (uploadErr instanceof DriveApiError && uploadErr.status === 401) {
            // Attempt automatic silent refresh before failing
            const refreshed = await getValidToken(true);
            if (refreshed) {
              activeToken = refreshed;
              info = await uploadBackupToDrive(activeToken, clean, sessionTimestamp);
            } else {
              throw uploadErr;
            }
          } else {
            throw uploadErr;
          }
        }

        setCloudFileInfo(info);
        setCloudWordCount(clean.length);
        setLastSyncedAt(new Date(sessionTimestamp));
        setSyncStatus('synced');
        setLastError(null);
        setIsTokenExpired(false);
      } catch (err: unknown) {
        console.warn('Auto-save to Google Drive error:', err);
        if (err instanceof DriveApiError && err.status === 401) {
          setIsTokenExpired(true);
          clearCachedToken();
          setSyncStatus('error');
          setLastError('Google Drive session expired. Click to reconnect.');
        } else {
          const msg = err instanceof Error ? err.message : 'Save error';
          setLastError(msg);
          setSyncStatus('error');
        }
      } finally {
        isSavingRef.current = false;
      }
    },
    [getValidToken, user]
  );

  // Check & Load Cloud Backup from Google Drive with smart timestamp comparison
  const checkAndLoadCloudBackup = useCallback(
    async (token: string, isStartup = false) => {
      try {
        setSyncStatus('syncing');
        let activeToken = token;
        let fileInfo: DriveFileInfo | null = null;
        try {
          fileInfo = await findDriveBackupFile(activeToken);
        } catch (searchErr) {
          if (searchErr instanceof DriveApiError && searchErr.status === 401) {
            const refreshed = await getValidToken(true);
            if (refreshed) {
              activeToken = refreshed;
              fileInfo = await findDriveBackupFile(activeToken);
            } else {
              throw searchErr;
            }
          } else {
            throw searchErr;
          }
        }
        setCloudFileInfo(fileInfo);

        if (fileInfo?.id) {
          const download = await downloadBackupFromDrive(activeToken, fileInfo.id);
          const cleanCloudWords = deduplicateWords(download.words);
          setCloudWordCount(cleanCloudWords.length);
          const cloudTimestamp = download.lastModified || new Date(fileInfo.modifiedTime).getTime() || Date.now();
          setLastSyncedAt(new Date(cloudTimestamp));

          if (isStartup) {
            // Initial startup load: merge with local cached words so nothing is ever overwritten
            const localCached = loadActiveWordsFromLocal();
            const combined = localCached.length > 0
              ? deduplicateWords([...cleanCloudWords, ...localCached])
              : cleanCloudWords;

            setWords(combined);
            saveActiveWordsToLocal(combined);
            sessionTimestampRef.current = cloudTimestamp;
            isInitialLoadDoneRef.current = true;
          } else {
            // Periodic / manual sync: merge with local changes based on timestamps
            setWords((current) => {
              const merged = current.length > 0
                ? deduplicateWords([...cleanCloudWords, ...current])
                : cleanCloudWords;
              saveActiveWordsToLocal(merged);
              return merged;
            });
          }
          setSyncStatus('synced');
          setIsTokenExpired(false);
          setLastError(null);
        } else {
          // File does not exist yet on user's Drive
          setCloudWordCount(0);
          const currentWords = wordsRef.current.length > 0 ? wordsRef.current : loadActiveWordsFromLocal();
          if (currentWords.length > 0) {
            const now = Date.now();
            sessionTimestampRef.current = now;
            const newFile = await uploadBackupToDrive(activeToken, currentWords, now);
            setCloudFileInfo(newFile);
            setCloudWordCount(currentWords.length);
            setLastSyncedAt(new Date(now));
            saveActiveWordsToLocal(currentWords);
          }
          isInitialLoadDoneRef.current = true;
          setSyncStatus('synced');
          setIsTokenExpired(false);
        }
      } catch (err: unknown) {
        console.warn('Google Drive cloud load error:', err);
        if (err instanceof DriveApiError && err.status === 401) {
          setIsTokenExpired(true);
          clearCachedToken();
          setSyncStatus('error');
          setLastError('Google Drive session expired. Click to reconnect.');
        } else {
          const msg = err instanceof Error ? err.message : 'Sync check failed';
          setLastError(msg);
          setSyncStatus('error');
        }
        isInitialLoadDoneRef.current = true;
      }
    },
    [setWords, getValidToken]
  );

  // Initialize Auth state on mount
  useEffect(() => {
    // 1. Instantly hydrate words from local persistent cache so user NEVER experiences blank screen
    const localCached = loadActiveWordsFromLocal();
    if (localCached.length > 0 && wordsRef.current.length === 0) {
      setWords(localCached);
      isInitialLoadDoneRef.current = true;
    }

    const unsubscribe = initAuth((state: AuthListenerState) => {
      setIsAuthLoading(state.isLoading);
      setUser(state.user);

      if (state.user && state.token && !state.isExpired) {
        setAccessToken(state.token);
        setIsTokenExpired(false);
        checkAndLoadCloudBackup(state.token, true);
      } else if (state.user && (state.isExpired || !state.token)) {
        setAccessToken(null);
        setIsTokenExpired(true);
        setSyncStatus('error');
        setLastError('Google Drive session expired. Click to reconnect.');
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
  }, [checkAndLoadCloudBackup, setWords]);

  // Sign In / Re-authenticate Handler
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
        await checkAndLoadCloudBackup(result.accessToken, true);
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
      setWords([]);
      saveActiveWordsToLocal([]);
      isInitialLoadDoneRef.current = false;
      addToast('Signed out.', 'info');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Real-time Automatic Debounced Cloud Save on any word change
  useEffect(() => {
    // Keep local persistent storage updated synchronously
    if (words.length > 0) {
      saveActiveWordsToLocal(words);
    }

    // Only auto-save once initial load has completed
    if (!isInitialLoadDoneRef.current || !user || !accessToken || isTokenExpired) {
      return;
    }

    // Update session timestamp
    const now = Date.now();
    sessionTimestampRef.current = now;
    setSyncStatus('unsaved');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Auto-save after 800ms of idle
    debounceTimerRef.current = setTimeout(() => {
      executeAutoSave(words, now);
    }, 800);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [words, user, accessToken, isTokenExpired, executeAutoSave]);

  // Force Manual Sync Now (in case user wants an immediate refresh)
  const syncNow = useCallback(async () => {
    const token = await getValidToken();
    if (!token || !user || isTokenExpired) {
      await handleSignIn();
      return;
    }

    try {
      setIsOperating(true);
      setSyncStatus('syncing');
      await checkAndLoadCloudBackup(token, false);
      const clean = deduplicateWords(wordsRef.current);
      const now = Date.now();
      sessionTimestampRef.current = now;
      const updatedInfo = await uploadBackupToDrive(token, clean, now);
      setCloudFileInfo(updatedInfo);
      setCloudWordCount(clean.length);
      setLastSyncedAt(new Date(now));
      setSyncStatus('synced');
      const pairsCount = extractAllPairs(clean).length;
      addToast(`Synchronized: ${clean.length} words (${pairsCount} pairs) saved to Drive.`, 'success');
    } catch (err: unknown) {
      console.error('Manual sync failed:', err);
      if (err instanceof DriveApiError && err.status === 401) {
        setIsTokenExpired(true);
        clearCachedToken();
        addToast('Session expired. Please reconnect.', 'error');
      } else {
        const msg = err instanceof Error ? err.message : 'Sync failed';
        setLastError(msg);
        addToast(`Sync error: ${msg}`, 'error');
      }
    } finally {
      setIsOperating(false);
    }
  }, [getValidToken, user, isTokenExpired, checkAndLoadCloudBackup, addToast]);

  // Reset Cloud Database to Empty (0 words)
  const clearCloudDatabase = useCallback(async () => {
    const token = await getValidToken();
    if (!token || !user) {
      setWords([]);
      addToast('Dictionary cleared.', 'info');
      return;
    }

    try {
      setIsOperating(true);
      setSyncStatus('syncing');
      setWords([]);
      const now = Date.now();
      sessionTimestampRef.current = now;
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
    syncNow,
    clearCloudDatabase,
  };
}


