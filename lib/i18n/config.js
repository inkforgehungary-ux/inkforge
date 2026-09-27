import dicts from './dictionaries.json';

export const LOCALES = [
  { code: 'hu', name: 'Magyar', flag: 'HU' },
  { code: 'en', name: 'English', flag: 'EN' },
  { code: 'de', name: 'Deutsch', flag: 'DE' },
  { code: 'fr', name: 'Francais', flag: 'FR' },
  { code: 'es', name: 'Espanol', flag: 'ES' },
  { code: 'it', name: 'Italiano', flag: 'IT' },
  { code: 'pt', name: 'Portugues', flag: 'PT' },
  { code: 'nl', name: 'Nederlands', flag: 'NL' },
  { code: 'pl', name: 'Polski', flag: 'PL' },
  { code: 'cs', name: 'Cestina', flag: 'CZ' },
  { code: 'sk', name: 'Slovencina', flag: 'SK' },
  { code: 'ro', name: 'Romana', flag: 'RO' },
  { code: 'tr', name: 'Turkce', flag: 'TR' },
  { code: 'ru', name: 'Russkij', flag: 'RU' },
  { code: 'ja', name: 'Nihongo', flag: 'JA' },
  { code: 'ko', name: 'Hangugeo', flag: 'KO' },
  { code: 'zh', name: 'Zhongwen', flag: 'ZH' },
  { code: 'th', name: 'Phasa Thai', flag: 'TH' },
  { code: 'ar', name: 'Arabiyya', flag: 'AR' },
  { code: 'he', name: 'Ivrit', flag: 'HE' },
];

export const DEFAULT_LOCALE = 'hu';
export const LOCALE_CODES = LOCALES.map(function (l) { return l.code; });

export function getDirection(locale) {
  return locale === 'ar' || locale === 'he' ? 'rtl' : 'ltr';
}

export function getFontClass(locale) {
  return '';
}

export function getDictionary(locale) {
  const base = (dicts && dicts.en) || {};
  if (locale === 'hu') return (dicts && dicts.hu) || base;
  if (dicts && dicts[locale]) return Object.assign({}, base, dicts[locale]);
  return base;
}

export function makeT(dict) {
  return function (key) { return dict && dict[key] != null ? dict[key] : key; };
}
