import re

with open('src/hooks/useServerSync.ts', 'r') as f:
    code = f.read()

old_effect = r"  // Initial load\n  useEffect\(\(\) => \{\n    if \(isFirstMount\.current\) \{\n      isFirstMount\.current = false;\n      if \(ApiClient\.token\) \{\n        fetchWords\(\);\n      \}\n    \}\n  \}, \[fetchWords\]\);"

new_effect = """  // Initial load or Auth change
  useEffect(() => {
    if (isAuthenticated && ApiClient.token) {
      fetchWords();
    }
  }, [isAuthenticated, fetchWords]);"""

code = re.sub(old_effect, new_effect, code)

with open('src/hooks/useServerSync.ts', 'w') as f:
    f.write(code)

