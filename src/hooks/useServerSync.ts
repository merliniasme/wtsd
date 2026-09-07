import { useEffect, useState, useCallback, useRef } from 'react';
import { Word, SyncStatus } from '../types';
import { ApiClient } from '../utils/api';
import { saveActiveWordsToLocal } from '../utils/storage';

interface UseServerSyncOptions {
  words: Word[];
  setWords: React.Dispatch<React.SetStateAction<Word[]>>;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function useServerSync({ words, setWords, addToast }: UseServerSyncOptions) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isTokenExpired, setIsTokenExpired] = useState(false);
  const isFirstMount = useRef(true);

  const fetchWords = useCallback(async (silent = true) => {
    if (!ApiClient.token) return;
    try {
      if (!silent) setSyncStatus('syncing');
      const serverWords = await ApiClient.getWords();
      setWords(serverWords);
      saveActiveWordsToLocal(serverWords);
      setLastSyncedAt(new Date());
      setIsTokenExpired(false);
      setSyncStatus('synced');
    } catch (err: any) {
      if (err.message.includes('token') || err.message.includes('Token')) {
        setIsTokenExpired(true);
      }
      setSyncStatus('error');
      if (!silent) addToast(err.message, 'error');
    }
  }, [setWords, addToast]);

  const pushWords = useCallback(async (newWords: Word[]) => {
    if (!ApiClient.token) return;
    try {
      setSyncStatus('syncing');
      await ApiClient.saveWords(newWords);
      setLastSyncedAt(new Date());
      setSyncStatus('synced');
      saveActiveWordsToLocal(newWords);
    } catch (err: any) {
      if (err.message.includes('token') || err.message.includes('Token')) {
        setIsTokenExpired(true);
      }
      setSyncStatus('error');
      addToast(err.message, 'error');
    }
  }, [addToast]);

  // Initial load
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      if (ApiClient.token) {
        fetchWords();
      }
    }
  }, [fetchWords]);

  return {
    syncStatus,
    lastSyncedAt,
    isTokenExpired,
    fetchWords,
    pushWords,
    isOperating: syncStatus === 'syncing',
  };
}
