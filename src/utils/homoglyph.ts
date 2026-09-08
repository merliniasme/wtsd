/**
 * Anti-Censorship text transformation utilities.
 * Uses Zero-Width Joiner (ZWJ) insertion to escape and bypass automated keyword filters.
 */

// Zero-Width Joiner (U+200D)
export const ZWJ = '\u200D';

/**
 * Transforms input text to escape censorship by inserting ZWJ in the middle of each word.
 */
export function insertZWJInMiddle(text: string): string {
  if (!text) return text;
  
  return text.split(' ').map(word => {
    if (word.length < 2) return word;
    const mid = Math.floor(word.length / 2);
    return word.substring(0, mid) + ZWJ + word.substring(mid);
  }).join(' ');
}

export function escapeCensoredWord(text: string): string {
  return insertZWJInMiddle(text);
}

/**
 * Robust copy helper with cross-browser and iframe fallback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Modern navigator.clipboard API
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back to document.execCommand
  }

  // 2. Fallback: temporary hidden textarea
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    textarea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
    return false;
  }
}
