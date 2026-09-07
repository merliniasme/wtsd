/**
 * Anti-Censorship text transformation utilities.
 * Uses Zero-Width Space insertion to escape and bypass automated keyword filters.
 */

// Zero-Width Space (U+200B)
export const ZWS = '\u200B';

/**
 * Transforms input text to escape censorship by inserting ZWS in the middle.
 */
export function insertZWSInMiddle(text: string): string {
  if (!text || text.length < 2) return text;
  const mid = Math.floor(text.length / 2);
  return text.substring(0, mid) + ZWS + text.substring(mid);
}

export function escapeCensoredWord(text: string): string {
  return insertZWSInMiddle(text);
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
