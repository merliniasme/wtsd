sed -i 's/interface UseServerSyncOptions {/interface UseServerSyncOptions {\n  isAuthenticated?: boolean;/g' src/hooks/useServerSync.ts
sed -i 's/export function useServerSync({ words, setWords, addToast }: UseServerSyncOptions) {/export function useServerSync({ words, setWords, addToast, isAuthenticated }: UseServerSyncOptions) {/g' src/hooks/useServerSync.ts
