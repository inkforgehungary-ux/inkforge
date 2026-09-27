import { notFound } from 'next/navigation';
import Nav from '../../components/Nav';
import { LOCALE_CODES, getDictionary, makeT, getFontClass } from '../../lib/i18n/config';

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALE_CODES.map((lang) => ({ lang }));
}

export function generateMetadata({ params }) {
  const t = makeT(getDictionary(params.lang));
  return { title: 'InkForge – ' + t('home.tagline') };
}

export default function LocaleLayout({ children, params }) {
  const { lang } = params;
  if (!LOCALE_CODES.includes(lang)) notFound();

  const t = makeT(getDictionary(lang));
  const fontClass = getFontClass(lang);
  const dir = lang === 'ar' || lang === 'he' ? 'rtl' : 'ltr';

  return (
    <div className={fontClass} dir={dir} lang={lang}>
      <Nav lang={lang} t={t} />
      {children}
      <footer className="border-t border-stone-800 px-6 py-8 text-xs text-stone-600">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <span>InkForge · Tattoo Stencil Platform · B2B</span>
          <span>{t('footer.note')}</span>
        </div>
      </footer>
    </div>
  );
}
