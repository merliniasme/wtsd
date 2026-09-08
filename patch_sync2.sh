cat << 'INNER' > temp_sync.js
const fs = require('fs');
let code = fs.readFileSync('src/hooks/useServerSync.ts', 'utf8');

const oldEffect = `// Initial load
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      if (ApiClient.token) {
        fetchWords();
      }
    }
  }, [fetchWords]);`;

const newEffect = `// Initial load or Auth change
  useEffect(() => {
    if (isAuthenticated && ApiClient.token) {
      fetchWords();
    }
  }, [isAuthenticated, fetchWords]);`;

code = code.replace(oldEffect, newEffect);
fs.writeFileSync('src/hooks/useServerSync.ts', code);
INNER
node temp_sync.js
