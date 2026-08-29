// Arabic Text Normalization helper for advanced NLP search
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    // Normalize Alef, Hamza, etc.
    .replace(/[أإآ]/g, 'ا')
    // Normalize Taa Marbouta to Haa
    .replace(/ة/g, 'ه')
    // Normalize Yaa / Alif Maqsurah to Yaa
    .replace(/[ىي]/g, 'ي')
    // Strip Arabic diacritics (harakat)
    .replace(/[\u064B-\u065F]/g, '')
    // Strip common punctuation
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '')
    .trim();
}
