/**
 * Smart HTML Translator
 * Translates text content while preserving HTML structure
 * Uses Google Translate API
 */

import { MMKVStorage } from '@utils/mmkv/mmkv';

export const TRANSLATION_CACHE_KEY = 'CHAPTER_TRANSLATIONS_V2';

// Google Translate API
const TRANSLATE_API = 'https://translate.googleapis.com/translate_a/single';

/**
 * Extract text segments from HTML for translation
 * Returns array of {text, isHtml} objects
 */
function parseHtmlForTranslation(html: string): Array<{text: string, isHtml: boolean}> {
  const segments: Array<{text: string, isHtml: boolean}> = [];

  // Match HTML tags and text content
  const regex = /(<[^>]+>)|([^<]+)/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    if (match[1]) {
      // HTML tag
      segments.push({ text: match[1], isHtml: true });
    } else if (match[2] && match[2].trim()) {
      // Text content
      segments.push({ text: match[2], isHtml: false });
    }
  }

  return segments;
}

/**
 * Translate text using Google Translate API
 */
async function translateText(text: string): Promise<string> {
  if (!text.trim()) return text;

  try {
    const url = `${TRANSLATE_API}?client=gtx&sl=en&tl=id&dt=t&q=${encodeURIComponent(text)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json() as any;

    if (data && data[0]) {
      let translated = '';
      for (const segment of data[0]) {
        if (segment[0]) {
          translated += segment[0];
        }
      }
      return translated || text;
    }

    return text;
  } catch (error) {
    console.warn('[Translator] Error:', error);
    throw error;
  }
}

/**
 * Split text into chunks for API limit (avoid too long requests)
 */
function splitIntoChunks(text: string, maxWords: number = 400): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentWordCount = 0;

  for (const word of words) {
    currentChunk.push(word);
    currentWordCount++;

    if (currentWordCount >= maxWords) {
      chunks.push(currentChunk.join(' '));
      currentChunk = [];
      currentWordCount = 0;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}

/**
 * Translate HTML content while preserving structure
 * Returns translated HTML with original formatting intact
 */
export async function translateHtml(html: string): Promise<string> {
  // Parse HTML into segments
  const segments = parseHtmlForTranslation(html);

  // Process text segments only
  const translatedSegments: Array<{text: string, isHtml: boolean}> = [];

  for (const segment of segments) {
    if (segment.isHtml) {
      // Keep HTML tags as-is
      translatedSegments.push(segment);
    } else {
      // Translate text content
      const text = segment.text.trim();
      if (!text) {
        translatedSegments.push(segment);
        continue;
      }

      // Skip if it's just punctuation or very short
      if (text.length < 3 || /^[^\w]+$/.test(text)) {
        translatedSegments.push(segment);
        continue;
      }

      try {
        // Split long text into chunks
        const chunks = splitIntoChunks(text);
        let translatedText = '';

        // Translate chunks in parallel for speed
        const translatedChunks = await Promise.all(
          chunks.map(chunk => translateText(chunk))
        );

        translatedText = translatedChunks.join(' ');
        translatedSegments.push({ text: translatedText, isHtml: false });
      } catch (error) {
        // On error, keep original text
        console.warn('[Translator] Failed to translate segment:', error);
        translatedSegments.push(segment);
      }
    }
  }

  // Reconstruct HTML
  return translatedSegments.map(s => s.text).join('');
}

/**
 * Get cached translation for a chapter
 */
export function getCachedTranslation(chapterId: number): string | null {
  try {
    const cacheStr = MMKVStorage.getString(TRANSLATION_CACHE_KEY);
    if (!cacheStr) return null;

    const cache = JSON.parse(cacheStr) as Record<string, string>;
    return cache[chapterId.toString()] || null;
  } catch {
    return null;
  }
}

/**
 * Cache translation for a chapter
 */
export function cacheTranslation(chapterId: number, translatedHtml: string): void {
  try {
    const cacheStr = MMKVStorage.getString(TRANSLATION_CACHE_KEY);
    const cache = cacheStr ? JSON.parse(cacheStr) as Record<string, string> : {};
    cache[chapterId.toString()] = translatedHtml;
    MMKVStorage.set(TRANSLATION_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('[Translator] Failed to cache:', error);
  }
}

/**
 * Clear all cached translations
 */
export function clearTranslationCache(): void {
  MMKVStorage.delete(TRANSLATION_CACHE_KEY);
}
