import { getDictionary, makeT, getFontClass, LOCALE_CODES } from '../../../lib/i18n/config';
import LocaleShell from '../../../components/LocaleShell';
import HomeContent from '../../../components/HomeContent';

export function generateMetadata({ params }) {
  const t = makeT(getDictionary(params.lang));
  const languages = {};
  for (const c of LOCALE_CODES) languages[c] = '/' + c;
  return {
    title: 'InkForge – ' + t('home.tagline'),
    alternates: { canonical: '/' + params.lang, languages },
  };
}

export default function HomePage({ params }) {
  const lang = params.lang;
  const t = makeT(getDictionary(lang));
  const fontClass = getFontClass(lang);
  const dir = lang === 'ar' || lang === 'he' ? 'rtl' : 'ltr';

  return (
    <div className={fontClass} dir={dir} lang={lang}>
      <LocaleShell lang={lang} t={t} dir={dir}>
        <HomeContent t={t} lang={lang} />
      </LocaleShell>
    </div>
  );
}
