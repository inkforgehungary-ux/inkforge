// Nyelvi layout — 4 nyelv (hu, en, de, pl). NULLA import.
export const dynamicParams = false;

const CODES = ['hu','en','de','pl'];

export function generateStaticParams() {
  return CODES.map(function (lang) { return { lang: lang }; });
}

export default function LocaleLayout({ children }) {
  return children;
}
