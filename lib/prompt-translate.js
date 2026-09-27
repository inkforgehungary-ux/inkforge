// INKFORGE — MULTILINGUAL PROMPT NORMALIZER
// Converts non-English user descriptions to concise English before SDXL.
// External translation is best-effort; generation never fails just because
// the translation service is unavailable.

const ENGLISH_HINTS = [
  'tattoo','wolf','lion','skull','rose','snake','dragon','eagle','raven',
  'sword','flower','moon','sun','face','head','wings','ornamental',
  'blackwork','linework','fine line','geometric','traditional'
];

function looksEnglish(text) {
  const d = String(text || '').toLowerCase();
  let score = 0;
  for (const word of ENGLISH_HINTS) {
    if (d.includes(word)) score++;
  }
  return score >= 1;
}

function protectLiteralText(text) {
  const literals = [];
  let out = String(text || '');

  // Quoted lettering should never be translated.
  out = out.replace(/(["“”„'])(.{2,80}?)(\1)/g, function(_, open, value) {
    const token = '__INKFORGE_LITERAL_' + literals.length + '__';
    literals.push(value);
    return token;
  });

  // Obvious all-caps tattoo lettering such as PRO PATRIA.
  out = out.replace(/\b[A-ZÁÉÍÓÚÖŐÜŰ]{2,}(?:\s+[A-ZÁÉÍÓÚÖŐÜŰ]{2,})*\b/g, function(value) {
    const token = '__INKFORGE_LITERAL_' + literals.length + '__';
    literals.push(value);
    return token;
  });

  return { text: out, literals };
}

function restoreLiteralText(text, literals) {
  let out = String(text || '');
  literals.forEach(function(value, i) {
    out = out.split('__INKFORGE_LITERAL_' + i + '__').join(value);
  });
  return out;
}

export async function translatePromptToEnglish(description) {
  const original = String(description || '').trim();
  if (!original) return { text: '', translated: false, source: 'empty' };

  // English prompts should go straight to the model.
  if (looksEnglish(original)) {
    return { text: original, translated: false, source: 'en' };
  }

  const protectedText = protectLiteralText(original);

  try {
    const url =
      'https://api.mymemory.translated.net/get?q=' +
      encodeURIComponent(protectedText.text) +
      '&langpair=auto%7Cen';

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) throw new Error('translation HTTP ' + response.status);

    const data = await response.json();
    const translated =
      data &&
      data.responseData &&
      typeof data.responseData.translatedText === 'string'
        ? data.responseData.translatedText.trim()
        : '';

    if (!translated || translated.length < 2) {
      throw new Error('empty translation');
    }

    return {
      text: restoreLiteralText(translated, protectedText.literals),
      translated: true,
      source: 'auto->en'
    };
  } catch (_) {
    // Never block tattoo generation because translation is unavailable.
    return {
      text: original,
      translated: false,
      source: 'fallback-original'
    };
  }
}
