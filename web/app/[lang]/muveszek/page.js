import { getDictionary, makeT } from '../../../lib/i18n/config';
import LocaleShell from '../../../../components/LocaleShell';

export function generateMetadata({ params }) {
  const t = makeT(getDictionary(params.lang));
  return { title: t('artists.title') + ' – InkForge' };
}

export default function ArtistsPage({ params }) {
  const t = makeT(getDictionary(params.lang));
  return (
    <LocaleShell lang={params.lang}>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">{t('artists.title')}</h1>
        <p className="mt-2 max-w-3xl text-sm text-stone-400">{t('artists.intro')}</p>
        <p className="mt-8 rounded-xl border border-stone-800 bg-stone-900/40 px-5 py-8 text-center text-sm text-stone-500">
          {t('market.soon')}
        </p>
      </main>
    </LocaleShell>
  );
}
