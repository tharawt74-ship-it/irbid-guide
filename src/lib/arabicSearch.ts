// Arabic Text Normalization helper for advanced NLP search
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    // Normalize Alef variations and Hamza
    .replace(/[أإآء]/g, 'ا')
    // Normalize Taa Marbouta to Haa
    .replace(/ة/g, 'ه')
    // Normalize Yaa / Alif Maqsurah / Nabrah to Yaa
    .replace(/[ىيئ]/g, 'ي')
    // Normalize Waw with Hamza to Waw
    .replace(/ؤ/g, 'و')
    // Remove Tatweel
    .replace(/ـ/g, '')
    // Strip Arabic diacritics (harakat & tanween)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Strip common Latin and Arabic punctuation
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'؟،؛]/g, '')
    .trim();
}
