import dicts from './dictionaries.json';

export const LOCALES = ['hu','en','de','fr','es','it','pt','nl','pl','cs','sk','ro','tr','ru','ja','ko','zh','th','ar','he'];
export const DEFAULT_LOCALE = 'hu';
export const LOCALE_CODES = LOCALES;

export function getDirection(locale) { return locale === 'ar' || locale === 'he' ? 'rtl' : 'ltr'; }
export function getFontClass(locale) { return ''; }

export function getDictionary(locale) {
  const base = (dicts && dicts.en) || {};
  if (locale === 'hu') return (dicts && dicts.hu) || base;
  if (dicts && dicts[locale]) return Object.assign({}, base, dicts[locale]);
  return base;
}

export function makeT(dict) {
  return function (key) { return dict && dict[key] != null ? dict[key] : key; };
}
