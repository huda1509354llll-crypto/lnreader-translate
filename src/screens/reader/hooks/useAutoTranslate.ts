/**
 * Auto-Translate Hook
 * Automatically translates English content to Indonesian
 * Only works when content is detected as English
 */

import { useCallback, useEffect, useState } from 'react';
import {
  translateHtml,
  getCachedTranslation,
  cacheTranslation,
} from '../services/translateHtml';

interface UseAutoTranslateResult {
  translatedHtml: string | null;
  isTranslating: boolean;
  error: string | null;
}

/**
 * Detect if text is likely English
 * Returns true if text contains mostly Latin characters
 */
function isLikelyEnglish(text: string): boolean {
  // Simple heuristic: check character distribution
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  const totalChars = (text.match(/[a-zA-Z0-9]/g) || []).length;

  if (totalChars === 0) return false;

  const latinRatio = latinChars / totalChars;

  // If more than 70% Latin characters, likely English
  return latinRatio > 0.7;
}

/**
 * Hook for auto-translating chapter content
 */
export function useAutoTranslate(
  chapterId: number,
  originalHtml: string,
): UseAutoTranslateResult {
  const [translatedHtml, setTranslatedHtml] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function doTranslate() {
      if (!originalHtml || originalHtml.length < 50) {
        // Too short, skip translation
        return;
      }

      // Check cache first
      const cached = getCachedTranslation(chapterId);
      if (cached) {
        if (!cancelled) {
          setTranslatedHtml(cached);
        }
        return;
      }

      // Detect if likely English
      if (!isLikelyEnglish(originalHtml)) {
        // Not English, no need to translate
        return;
      }

      if (cancelled) return;

      setIsTranslating(true);
      setError(null);

      try {
        const translated = await translateHtml(originalHtml);

        if (!cancelled) {
          // Cache the result
          cacheTranslation(chapterId, translated);
          setTranslatedHtml(translated);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Translation failed');
          // On error, keep original HTML
          setTranslatedHtml(null);
        }
      } finally {
        if (!cancelled) {
          setIsTranslating(false);
        }
      }
    }

    doTranslate();

    return () => {
      cancelled = true;
    };
  }, [chapterId, originalHtml]);

  return {
    translatedHtml,
    isTranslating,
    error,
  };
}

/**
 * Simple translation function for use outside hooks
 */
export async function autoTranslate(
  chapterId: number,
  originalHtml: string,
): Promise<string> {
  // Check cache first
  const cached = getCachedTranslation(chapterId);
  if (cached) {
    return cached;
  }

  // Check if likely English
  if (!isLikelyEnglish(originalHtml)) {
    return originalHtml;
  }

  // Translate
  const translated = await translateHtml(originalHtml);

  // Cache
  cacheTranslation(chapterId, translated);

  return translated;
}
