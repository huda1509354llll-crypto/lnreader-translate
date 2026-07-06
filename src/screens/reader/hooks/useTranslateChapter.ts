import { useCallback } from 'react';
import { getString } from '@strings/translations';
import {
  cacheTranslation,
  getCachedTranslation,
  translateText,
  wrapInParagraphs,
  stripHtml,
} from '../services/translateChapter';
import { showToast } from '@utils/showToast';

interface TranslateChapterOptions {
  chapterId: number;
  originalHtml: string;
  translateEnabled: boolean;
}

export function useTranslateChapter() {
  const translateChapterIfNeeded = useCallback(
    async ({
      chapterId,
      originalHtml,
      translateEnabled,
    }: TranslateChapterOptions): Promise<string> => {
      // Return original immediately if translation is disabled
      if (!translateEnabled) {
        return originalHtml;
      }

      // 1. Check cache first
      const cached = getCachedTranslation(chapterId);
      if (cached) {
        return cached;
      }

      // 2. Strip HTML and translate
      try {
        const plainText = stripHtml(originalHtml);
        if (!plainText.trim()) {
          return originalHtml;
        }

        const translatedText = await translateText(plainText);
        const translatedHtml = wrapInParagraphs(translatedText);

        // 3. Cache the result
        cacheTranslation(chapterId, translatedHtml);

        return translatedHtml;
      } catch (err) {
        // 4. On error, fall back to original and notify the user
        console.warn('[AutoTranslate] Translation failed:', err);
        showToast(getString('readerScreen.bottomSheet.translationError'));
        return originalHtml;
      }
    },
    [],
  );

  return { translateChapterIfNeeded };
}
