import { getDictionary, makeT, LOCALE_CODES } from '../../lib/i18n/config';
import LocaleShell from '../../components/LocaleShell';
import HomeContent from '../../components/HomeContent';

export function generateMetadata({ params }) {
  const t = makeT(getDictionary(params.lang));
  const languages = {};
  for (let i = 0; i < LOCALE_CODES.length; i++) languages[LOCALE_CODES[i]] = '/' + LOCALE_CODES[i];
  return {
    title: 'InkForge - ' + t('home.tagline'),
    alternates: { canonical: '/' + params.lang, languages: languages },
  };
}

export default function HomePage({ params }) {
  const lang = params.lang;
  const t = makeT(getDictionary(lang));
  const dir = lang === 'ar' || lang === 'he' ? 'rtl' : 'ltr';
  return (
    <LocaleShell lang={lang} t={t} dir={dir}>
      <HomeContent t={t} lang={lang} />
    </LocaleShell>
  );
}
