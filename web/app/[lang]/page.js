import { getDictionary, makeT, getFontClass } from '../../lib/i18n/config';
import LocaleShell from '../../../components/LocaleShell';
import HomeContent from '../../../components/HomeContent';

export function generateStaticParams() {
  return [
    { lang: 'hu' }, { lang: 'en' }, { lang: 'de' }, { lang: 'fr' },
    { lang: 'es' }, { lang: 'it' }, { lang: 'pt' }, { lang: 'nl' },
    { lang: 'pl' }, { lang: 'cs' }, { lang: 'sk' }, { lang: 'ro' },
    { lang: 'tr' }, { lang: 'ru' }, { lang: 'ja' }, { lang: 'ko' },
    { lang: 'zh' }, { lang: 'th' }, { lang: 'ar' }, { lang: 'he' },
  ];
}

export function generateMetadata({ params }) {
  const t = makeT(getDictionary(params.lang));
  return { title: 'InkForge – ' + t('home.tagline') };
}

export default function LangHomePage({ params }) {
  const lang = params.lang;
  const t = makeT(getDictionary(lang));
  const fontClass = getFontClass(lang);
  const dir = lang === 'ar' || lang === 'he' ? 'rtl' : 'ltr';

  return (
    <div className={fontClass} dir={dir} lang={lang}>
      <LocaleShellInline lang={lang} t={t} />
      <HomeContent t={t} lang={lang} />
    </div>
  );
}

function LocaleShellInline({ lang, t }) {
  return null;
}
