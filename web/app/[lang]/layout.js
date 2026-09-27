import { notFound } from 'next/navigation';
import { LOCALE_CODES } from '../../lib/i18n/config';

export function generateStaticParams() {
  return LOCALE_CODES.map((lang) => ({ lang }));
}

export default function LocaleLayout({ children, params }) {
  if (!LOCALE_CODES.includes(params.lang)) notFound();
  return children;
}
