import { LOCALE_CODES } from '../../lib/i18n/config';

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALE_CODES.map((lang) => ({ lang }));
}

export default function LocaleLayout({ children }) {
  return children;
}
