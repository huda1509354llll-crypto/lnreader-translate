import { MMKVStorage } from '@utils/mmkv/mmkv';

export const CHAPTER_TRANSLATIONS = 'CHAPTER_TRANSLATIONS';

const MYMEMORY_API = 'https://api.mymemory.translated.net/get';

/** Maximum words per MyMemory request. Chunks are joined with \n\n. */
const MAX_WORDS_PER_CHUNK = 450;

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
 * Split text into chunks of approximately MAX_WORDS_PER_CHUNK words.
 */
function splitIntoChunks(text: string): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let current: string[] = [];
  let count = 0;

  for (const word of words) {
    current.push(word);
    count++;
    if (count >= MAX_WORDS_PER_CHUNK) {
      chunks.push(current.join(' '));
      current = [];
      count = 0;
    }
  }
  if (current.length > 0) {
    chunks.push(current.join(' '));
  }
  return chunks;
}

interface MyMemoryResponse {
  responseStatus: number;
  responseData: {
    translatedText: string;
  };
}

/**
 * Translate a single chunk via MyMemory API.
 */
async function translateChunk(text: string): Promise<string> {
  const url = `${MYMEMORY_API}?q=${encodeURIComponent(text)}&langpair=en|id`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`MyMemory HTTP ${response.status}`);
  }

  const data = (await response.json()) as MyMemoryResponse;

  if (data.responseStatus !== 200) {
    throw new Error(`MyMemory status ${data.responseStatus}`);
  }

  return data.responseData.translatedText;
}

/**
 * Translate plain text (en → id) using MyMemory, chunking long content.
 * Returns translated text with preserved paragraph structure.
 */
export async function translateText(text: string): Promise<string> {
  const chunks = splitIntoChunks(text);

  // Translate chunks in parallel for better performance
  const results = await Promise.all(chunks.map(translateChunk));

  return results.join('\n\n');
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
    // Silently fail — translation caching is non-critical.
  }
}

/**
 * Clear the entire translation cache.
 */
export function clearTranslationCache(): void {
  MMKVStorage.delete(CHAPTER_TRANSLATIONS);
}
