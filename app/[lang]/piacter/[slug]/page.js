import { getDictionary, makeT } from '../../lib/i18n/config';
import LocaleShell from '../../../components/LocaleShell';

export function generateMetadata({ params }) {
  const t = makeT(getDictionary(params.lang));
  return { title: t('market.title') + ' - InkForge' };
}

export default function CategoryPage({ params }) {
  const lang = params.lang;
  const slug = params.slug;
  const t = makeT(getDictionary(lang));
  return (
    <LocaleShell lang={lang} t={t}>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <a href={'/' + lang + '/piacter'} className="text-sm text-stone-500 hover:text-amber-400">Vissza</a>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{t('market.cat.' + slug)}</h1>
        <p className="mt-6 rounded-xl border border-stone-800 bg-stone-900/40 px-5 py-8 text-center text-sm text-stone-500">{t('market.soon')}</p>
      </main>
    </LocaleShell>
  );
}
