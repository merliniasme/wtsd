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
import { validateAndImportJson, deduplicateWords, cleanupLegacyLocalStorage } from '../utils/storage';
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

  // Ref to track the latest words without stale closures
  const wordsRef = useRef<Word[]>(words);
  wordsRef.current = words;

  // Ref for debounce timer
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitializedRef = useRef(false);

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

  // Check & Load Cloud Backup from Google Drive
  const checkCloudBackup = useCallback(async (token: string, shouldInitialLoad = false) => {
    try {
      setSyncStatus('syncing');
      const fileInfo = await findDriveBackupFile(token);
      setCloudFileInfo(fileInfo);

      if (fileInfo?.id) {
        const download = await downloadBackupFromDrive(token, fileInfo.id);
        const cleanCloudWords = deduplicateWords(download.words);
        setCloudWordCount(cleanCloudWords.length);
        setLastSyncedAt(new Date(fileInfo.modifiedTime || Date.now()));

        if (shouldInitialLoad) {
          if (cleanCloudWords.length > 0) {
            setWords((current) => {
              if (current.length === 0) {
                return cleanCloudWords;
              }
              // Merge & deduplicate
              return deduplicateWords([...current, ...cleanCloudWords]);
            });
            addToast(`Online Sync: Loaded ${cleanCloudWords.length} words from Google Drive.`, 'success');
          } else if (wordsRef.current.length > 0) {
            const cleanLocal = deduplicateWords(wordsRef.current);
            await uploadBackupToDrive(token, cleanLocal);
            setCloudWordCount(cleanLocal.length);
          }
        }
        setSyncStatus('synced');
      } else {
        setCloudWordCount(null);
        // If file doesn't exist on drive yet and we have words in memory, create initial online database
        if (wordsRef.current.length > 0) {
          const cleanLocal = deduplicateWords(wordsRef.current);
          const newFile = await uploadBackupToDrive(token, cleanLocal);
          setCloudFileInfo(newFile);
          setCloudWordCount(cleanLocal.length);
          setLastSyncedAt(new Date());
          addToast(`Created new database in Google Drive with ${cleanLocal.length} words.`, 'success');
        }
        setSyncStatus('synced');
      }
    } catch (err: unknown) {
      console.warn('Google Drive online sync error:', err);
      const msg = err instanceof Error ? err.message : 'Sync check failed';
      setLastError(msg);
      setSyncStatus('error');
    }
  }, [addToast, setWords]);

  // Purge any legacy localStorage cache on mount and listen to Google Auth state
  useEffect(() => {
    cleanupLegacyLocalStorage();

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
      setWords([]);
      addToast('Signed out from Google Drive.', 'info');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Immediate Save to Google Drive with Strict Deduplication
  const saveToDriveNow = useCallback(async (currentWords?: Word[]) => {
    const targetWords = deduplicateWords(currentWords || wordsRef.current);
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

  // Bi-directional Online Sync with Google Drive & Zero Double Data
  const syncNow = useCallback(async () => {
    let token = await getValidToken();
    if (!token || !user) {
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
        const clean = deduplicateWords(wordsRef.current);
        const info = await uploadBackupToDrive(token, clean);
        setCloudFileInfo(info);
        setCloudWordCount(clean.length);
        setLastSyncedAt(new Date());
        setSyncStatus('synced');
        addToast(`Online Sync: Created database in Google Drive with ${clean.length} words.`, 'success');
        return;
      }

      // Download from Google Drive
      const cloudData = await downloadBackupFromDrive(token, existingFile.id);

      // Merge local and cloud words with deduplication
      const mergeRes = validateAndImportJson(cloudData.rawText, wordsRef.current, 'merge');
      if (!mergeRes.success || !mergeRes.words) {
        throw new Error(mergeRes.error || 'Failed to merge cloud database.');
      }

      const cleanMergedWords = deduplicateWords(mergeRes.words);
      setWords(cleanMergedWords);

      // Save merged result back to Google Drive
      const updatedInfo = await uploadBackupToDrive(token, cleanMergedWords);
      setCloudFileInfo(updatedInfo);
      setCloudWordCount(cleanMergedWords.length);
      setLastSyncedAt(new Date());
      setSyncStatus('synced');

      const pairsCount = extractAllPairs(cleanMergedWords).length;
      addToast(
        `Cloud Synced: ${cleanMergedWords.length} words (${pairsCount} pairs) unified online.`,
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

  // Clean and Deduplicate Database Action (minimizes double data & orphan relations)
  const cleanAndDeduplicateNow = useCallback(async () => {
    const rawWords = wordsRef.current;
    const initialCount = rawWords.length;
    const initialPairs = extractAllPairs(rawWords).length;

    const cleaned = deduplicateWords(rawWords);
    const finalCount = cleaned.length;
    const finalPairs = extractAllPairs(cleaned).length;

    setWords(cleaned);

    const token = await getValidToken();
    if (token && user) {
      try {
        setIsOperating(true);
        setSyncStatus('syncing');
        const info = await uploadBackupToDrive(token, cleaned);
        setCloudFileInfo(info);
        setCloudWordCount(cleaned.length);
        setLastSyncedAt(new Date());
        setSyncStatus('synced');
      } catch (err) {
        console.error('Failed to upload deduplicated data:', err);
      } finally {
        setIsOperating(false);
      }
    }

    const removedWords = Math.max(0, initialCount - finalCount);
    const removedPairs = Math.max(0, initialPairs - finalPairs);

    if (removedWords > 0 || removedPairs > 0) {
      addToast(
        `Cleaned & Deduplicated: Removed ${removedWords} duplicate words and ${removedPairs} redundant links.`,
        'success'
      );
    } else {
      addToast('Dictionary is already 100% clean with zero duplicate data.', 'info');
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
      const clean = deduplicateWords(result.words);
      setWords(clean);
      setCloudWordCount(clean.length);
      setLastSyncedAt(new Date());
      setSyncStatus('synced');

      const pairs = extractAllPairs(clean);
      addToast(`Restored ${clean.length} words (${pairs.length} pairs) from Google Drive.`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Restore failed';
      setLastError(msg);
      setSyncStatus('error');
      addToast(`Restore error: ${msg}`, 'error');
    } finally {
      setIsOperating(false);
    }
  }, [addToast, cloudFileInfo?.id, getValidToken, setWords, user]);

  // Reset Cloud Database to Empty
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
      const info = await uploadBackupToDrive(token, []);
      setCloudFileInfo(info);
      setCloudWordCount(0);
      setLastSyncedAt(new Date());
      setSyncStatus('synced');
      addToast('Google Drive cloud database reset to 0 words.', 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reset failed';
      setLastError(msg);
      setSyncStatus('error');
      addToast(`Reset error: ${msg}`, 'error');
    } finally {
      setIsOperating(false);
    }
  }, [addToast, getValidToken, setWords, user]);

  // Real-time Debounced Auto-Save to Google Drive on word changes
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

    // Auto-save to Google Drive after 1.2s of inactivity
    debounceTimerRef.current = setTimeout(() => {
      saveToDriveNow(words);
    }, 1200);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [words, user, accessToken, saveToDriveNow]);

  // Periodic Occasional Online Sync (Every 3 minutes in background)
  useEffect(() => {
    if (!user || !accessToken) return;

    const intervalId = setInterval(() => {
      checkCloudBackup(accessToken, false);
    }, 3 * 60 * 1000);

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
    cleanAndDeduplicateNow,
    clearCloudDatabase,
    refreshStatus: () => accessToken && checkCloudBackup(accessToken, false),
  };
}

