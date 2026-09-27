import { getDictionary, makeT, getFontClass } from '../../lib/i18n/config';
import Nav from '../../../components/Nav';
import HomeContent from '../../../components/HomeContent';

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ lang: 'hu' }];
}

export function generateMetadata({ params }) {
  const t = makeT(getDictionary(params.lang));
  return { title: 'InkForge – ' + t('home.tagline') };
}

export default function Page({ params }) {
  const lang = params.lang;
  const t = makeT(getDictionary(lang));
  const fontClass = getFontClass(lang);

  return (
    <div className={fontClass} dir="ltr" lang={lang}>
      <Nav lang={lang} t={t} />
      <HomeContent t={t} lang={lang} />
      <footer className="border-t border-stone-800 px-6 py-8 text-xs text-stone-600">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <span>InkForge · Tattoo Stencil Platform · B2B</span>
          <span>{t('footer.note')}</span>
        </div>
      </footer>
    </div>
  );
}
