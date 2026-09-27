// Nyelvi layout — NULLA import.
export const dynamicParams = false;

const CODES = ['hu','en','de','fr','es','it','pt','nl','pl','cs','sk','ro','tr','ru','ja','ko','zh','th','ar','he'];

export function generateStaticParams() {
  return CODES.map(function (lang) { return { lang: lang }; });
}

export default function LocaleLayout({ children }) {
  return children;
}
