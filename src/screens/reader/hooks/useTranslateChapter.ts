import { useCallback } from 'react';
import {
  cacheTranslation,
  getCachedTranslation,
  translateText,
  wrapInParagraphs,
  stripHtml,
} from '../services/translateChapter';

/**
 * Auto-translate hook - translates English to Indonesian automatically
 * No settings needed, just works when reading English content
 */
export function useTranslateChapter() {
  const translateChapterIfNeeded = useCallback(
    async ({
      chapterId,
      originalHtml,
    }: {
      chapterId: number;
      originalHtml: string;
    }): Promise<string> => {
      // Check cache first
      const cached = getCachedTranslation(chapterId);
      if (cached) {
        return cached;
      }

      // Strip HTML and translate
      try {
        const plainText = stripHtml(originalHtml);
        if (!plainText.trim()) {
          return originalHtml;
        }

        // Auto-translate from English to Indonesian using Google Translate
        const translatedText = await translateText(plainText, 'en', 'id');
        const translatedHtml = wrapInParagraphs(translatedText);

        // Cache the result
        cacheTranslation(chapterId, translatedHtml);

        return translatedHtml;
      } catch (err) {
        console.warn('[AutoTranslate] Failed:', err);
        // On error, return original text
        return originalHtml;
      }
    },
    [],
  );

  return { translateChapterIfNeeded };
}
