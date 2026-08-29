import React, { useState, useEffect, useCallback, useRef, Dispatch, SetStateAction } from 'react';
import { Word, SyncStatus } from '../types';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  googleSignOut,
  getAccessToken,
} from '../utils/googleAuth';
import {
  findDriveBackupFile,
  uploadBackupToDrive,
  downloadBackupFromDrive,
  DriveFileInfo,
} from '../utils/googleDrive';
import { validateAndImportJson } from '../utils/storage';
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
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [cloudFileInfo, setCloudFileInfo] = useState<DriveFileInfo | null>(null);
  const [cloudWordCount, setCloudWordCount] = useState<number | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isOperating, setIsOperating] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Ref to track the latest words without resetting interval/debounce closures
  const wordsRef = useRef<Word[]>(words);
  wordsRef.current = words;

  // Ref for debounce timer
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to prevent initial mount from triggering a fake unsynced auto-save
  const hasInitializedRef = useRef(false);

  // Helper to ensure we have a valid access token
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

  // Check cloud backup status
  const checkCloudBackup = useCallback(async (token: string, shouldInitialLoad = false) => {
    try {
      setSyncStatus('syncing');
      const fileInfo = await findDriveBackupFile(token);
      setCloudFileInfo(fileInfo);

      if (fileInfo?.id) {
        const download = await downloadBackupFromDrive(token, fileInfo.id);
        setCloudWordCount(download.totalWords);
        setLastSyncedAt(new Date(fileInfo.modifiedTime || Date.now()));

        if (shouldInitialLoad) {
          // If cloud has words, merge or load them
          if (download.words.length > 0) {
            setWords((currentLocal) => {
              if (currentLocal.length === 0) {
                return download.words;
              }
              // Merge local cache and cloud data
              const mergeResult = validateAndImportJson(download.rawText, currentLocal, 'merge');
              return mergeResult.words || download.words;
            });
            addToast(`Loaded ${download.words.length} words from Google Drive database.`, 'success');
          } else if (wordsRef.current.length > 0) {
            // Local has words but cloud is empty, upload local
            await uploadBackupToDrive(token, wordsRef.current);
            setCloudWordCount(wordsRef.current.length);
          }
        }
        setSyncStatus('synced');
      } else {
        setCloudWordCount(null);
        // If file doesn't exist on drive yet and we have local words, create initial backup
        if (wordsRef.current.length > 0) {
          const newFile = await uploadBackupToDrive(token, wordsRef.current);
          setCloudFileInfo(newFile);
          setCloudWordCount(wordsRef.current.length);
          setLastSyncedAt(new Date());
          addToast(`Created new database in Google Drive with ${wordsRef.current.length} words.`, 'success');
        }
        setSyncStatus('synced');
      }
    } catch (err: unknown) {
      console.warn('Google Drive sync check error:', err);
      const msg = err instanceof Error ? err.message : 'Sync check failed';
      setLastError(msg);
      setSyncStatus('error');
    }
  }, [addToast, setWords]);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = initAuth(
      (loggedInUser, token) => {
        setUser(loggedInUser);
        setAccessToken(token);
        checkCloudBackup(token, true);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setCloudFileInfo(null);
        setCloudWordCount(null);
        setSyncStatus('idle');
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [checkCloudBackup]);

  // Sign In Handler
  const handleSignIn = async () => {
    setIsSigningIn(true);
    setLastError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        addToast(`Signed in as ${result.user.displayName || result.user.email}`, 'success');
        await checkCloudBackup(result.accessToken, true);
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
      setCloudFileInfo(null);
      setCloudWordCount(null);
      setSyncStatus('idle');
      addToast('Signed out from Google Drive. Local cache retained temporarily.', 'info');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Immediate Save/Backup to Google Drive
  const saveToDriveNow = useCallback(async (currentWords?: Word[]) => {
    const targetWords = currentWords || wordsRef.current;
    const token = await getValidToken();

    if (!token || !user) {
      setSyncStatus('unsaved');
      return;
    }

    try {
      setSyncStatus('syncing');
      setIsOperating(true);
      const info = await uploadBackupToDrive(token, targetWords);
      setCloudFileInfo(info);
      setCloudWordCount(targetWords.length);
      setLastSyncedAt(new Date());
      setSyncStatus('synced');
      setLastError(null);
    } catch (err: unknown) {
      console.error('Failed to save to Google Drive:', err);
      const msg = err instanceof Error ? err.message : 'Drive save failed';
      setLastError(msg);
      setSyncStatus('error');
    } finally {
      setIsOperating(false);
    }
  }, [getValidToken, user]);

  // Bi-directional Smart Sync with Google Drive
  const syncNow = useCallback(async () => {
    let token = await getValidToken();
    if (!token || !user) {
      // Prompt sign in if not connected
      try {
        const res = await googleSignIn();
        if (res) {
          token = res.accessToken;
          setUser(res.user);
          setAccessToken(token);
        } else {
          return;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Authentication required';
        addToast(`Sign-in needed to sync: ${msg}`, 'error');
        return;
      }
    }

    try {
      setIsOperating(true);
      setSyncStatus('syncing');
      const existingFile = await findDriveBackupFile(token);

      if (!existingFile?.id) {
        // No file on drive yet, upload current local words
        const info = await uploadBackupToDrive(token, wordsRef.current);
        setCloudFileInfo(info);
        setCloudWordCount(wordsRef.current.length);
        setLastSyncedAt(new Date());
        setSyncStatus('synced');
        addToast(`Synced: Uploaded ${wordsRef.current.length} words to Google Drive.`, 'success');
        return;
      }

      // Download from Google Drive
      const cloudData = await downloadBackupFromDrive(token, existingFile.id);

      // Merge local and cloud words
      const mergeRes = validateAndImportJson(cloudData.rawText, wordsRef.current, 'merge');
      if (!mergeRes.success || !mergeRes.words) {
        throw new Error(mergeRes.error || 'Failed to merge cloud database.');
      }

      const mergedWords = mergeRes.words;
      setWords(mergedWords);

      // Save merged result back to Google Drive
      const updatedInfo = await uploadBackupToDrive(token, mergedWords);
      setCloudFileInfo(updatedInfo);
      setCloudWordCount(mergedWords.length);
      setLastSyncedAt(new Date());
      setSyncStatus('synced');

      const pairsCount = extractAllPairs(mergedWords).length;
      addToast(
        `Synced with Google Drive: ${mergedWords.length} words (${pairsCount} pairs) up to date.`,
        'success'
      );
    } catch (err: unknown) {
      console.error('Sync failed:', err);
      const msg = err instanceof Error ? err.message : 'Sync failed';
      setLastError(msg);
      setSyncStatus('error');
      addToast(`Sync error: ${msg}`, 'error');
    } finally {
      setIsOperating(false);
    }
  }, [addToast, getValidToken, setWords, user]);

  // Restore from Drive (Clean Replace)
  const restoreFromDrive = useCallback(async () => {
    const token = await getValidToken();
    if (!token || !user) {
      addToast('Please sign in with Google first.', 'info');
      return;
    }

    if (!cloudFileInfo?.id) {
      addToast('No database backup found on Google Drive.', 'info');
      return;
    }

    try {
      setIsOperating(true);
      setSyncStatus('syncing');
      const result = await downloadBackupFromDrive(token, cloudFileInfo.id);
      setWords(result.words);
      setCloudWordCount(result.words.length);
      setLastSyncedAt(new Date());
      setSyncStatus('synced');

      const pairs = extractAllPairs(result.words);
      addToast(`Restored ${result.words.length} words (${pairs.length} pairs) from Google Drive.`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Restore failed';
      setLastError(msg);
      setSyncStatus('error');
      addToast(`Restore error: ${msg}`, 'error');
    } finally {
      setIsOperating(false);
    }
  }, [addToast, cloudFileInfo?.id, getValidToken, setWords, user]);

  // Debounced Auto-Save to Drive whenever words change
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      return;
    }

    if (!user || !accessToken) {
      setSyncStatus('unsaved');
      return;
    }

    setSyncStatus('unsaved');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Auto-save to Google Drive after 2.5 seconds of inactivity
    debounceTimerRef.current = setTimeout(() => {
      saveToDriveNow(words);
    }, 2500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [words, user, accessToken, saveToDriveNow]);

  // Periodic Occasional Sync (Every 4 minutes in background)
  useEffect(() => {
    if (!user || !accessToken) return;

    const intervalId = setInterval(() => {
      // Occasional background check / sync
      checkCloudBackup(accessToken, false);
    }, 4 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [user, accessToken, checkCloudBackup]);

  return {
    user,
    accessToken,
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
    saveToDriveNow,
    restoreFromDrive,
    refreshStatus: () => accessToken && checkCloudBackup(accessToken, false),
  };
}
