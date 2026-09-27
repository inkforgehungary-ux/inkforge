import { getDictionary, getDirection, makeT, LOCALE_CODES } from '../../lib/i18n/config';
import Nav from '../../components/Nav';

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALE_CODES.map(function (lang) {
    return { lang };
  });
}

export default function LocaleLayout({ children, params }) {
  const lang = params.lang;
  const t = makeT(getDictionary(lang));
  const dir = getDirection(lang);

  return (
    <div className="flex min-h-screen flex-col bg-stone-950" dir={dir} lang={lang}>
      <Nav lang={lang} t={t} />
      <div className="flex-1">{children}</div>
      <footer className="border-t border-stone-800 px-6 py-8 text-xs text-stone-600">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>InkForge B2B</span>
          <span>{t('footer.note')}</span>
        </div>
      </footer>
    </div>
  );
}
