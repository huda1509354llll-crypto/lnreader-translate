import { MMKVStorage } from '@utils/mmkv/mmkv';

export const CHAPTER_TRANSLATIONS = 'CHAPTER_TRANSLATIONS';

// Google Translate unofficial API (free, no API key needed)
const GOOGLE_TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';

/**
 * Strip HTML tags and decode common HTML entities.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '...')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Re-wrap translated plain text into basic paragraph HTML.
 */
export function wrapInParagraphs(text: string): string {
  return text
    .split(/\n\n+/)
    .map(para => {
      const trimmed = para.trim();
      if (!trimmed) {
        return '';
      }
      return `<p>${trimmed}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Translate text using Google Translate API (free unofficial endpoint)
 * @param text - Text to translate
 * @param fromLang - Source language (default: 'en')
 * @param toLang - Target language (default: 'id')
 */
export async function translateText(
  text: string,
  fromLang: string = 'en',
  toLang: string = 'id',
): Promise<string> {
  try {
    const url = `${GOOGLE_TRANSLATE_URL}?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(text)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json() as any;

    // Google Translate returns array of arrays: [[translated_text, src_text, confidence], ...]
    // Each element is [translated_text, original, null, null]
    if (data && data[0]) {
      let translatedText = '';
      for (const segment of data[0]) {
        if (segment[0]) {
          translatedText += segment[0];
        }
      }
      return translatedText || text;
    }

    return text;
  } catch (error) {
    console.warn('[Translate] Error:', error);
    throw error;
  }
}

/**
 * Read the translation cache for a chapter.
 */
export function getCachedTranslation(chapterId: number): string | undefined {
  try {
    const cache = JSON.parse(
      MMKVStorage.getString(CHAPTER_TRANSLATIONS) || '{}',
    ) as Record<number, string>;
    return cache[chapterId];
  } catch {
    return undefined;
  }
}

/**
 * Store a translation in the cache.
 */
export function cacheTranslation(chapterId: number, html: string): void {
  try {
    const cache = JSON.parse(
      MMKVStorage.getString(CHAPTER_TRANSLATIONS) || '{}',
    ) as Record<number, string>;
    cache[chapterId] = html;
    MMKVStorage.set(CHAPTER_TRANSLATIONS, JSON.stringify(cache));
  } catch {
    // Silently fail
  }
}

/**
 * Clear the entire translation cache.
 */
export function clearTranslationCache(): void {
  MMKVStorage.delete(CHAPTER_TRANSLATIONS);
}
