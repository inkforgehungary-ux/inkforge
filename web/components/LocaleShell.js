import { getDictionary, makeT, getFontClass } from '../lib/i18n/config';
import Nav from './Nav';
import HomeContent from './HomeContent';

export default function LocaleShell({ lang, children }) {
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
