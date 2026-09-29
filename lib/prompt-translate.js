// INKFORGE — LOCAL PROMPT NORMALIZER
// Külső fordító API nélkül. Az AI képgenerálás kizárólag RunPodon fut.

export const PROMPT_TRANSLATOR_VERSION = '2.0.0';

export async function translatePromptToEnglish(description) {
  const original = String(description || '').trim();
  if (!original) return { text: '', translated: false, source: 'empty' };

  // Nincs külső fordító szolgáltatás. A prompt változtatás nélkül megy a RunPod workerhez.
  return {
    text: original,
    translated: false,
    source: 'original'
  };
}
