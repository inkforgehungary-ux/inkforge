import { notFound } from 'next/navigation';
import Nav from '../../components/Nav';
import { LOCALE_CODES, getDictionary, makeT, getFontClass } from '../../lib/i18n/config';
import '../globals.css';

export function generateStaticParams() {
  return LOCALE_CODES.map((lang) => ({ lang }));
}

export function generateMetadata({ params }) {
  const t = makeT(getDictionary(params.lang));
  return { title: 'InkForge – ' + t('home.tagline') };
}

// A nyelvi layout NEM ad html/body-t (azt a gyoker layout adja),
// csak a nyelv-specifikus keretet: betukeszlet, irany, navigacio.
export default function LocaleLayout({ children, params }) {
  const { lang } = params;
  if (!LOCALE_CODES.includes(lang)) notFound();

  const dict = getDictionary(lang);
  const t = makeT(dict);
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
