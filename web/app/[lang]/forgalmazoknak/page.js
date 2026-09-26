import { getDictionary, makeT } from '../../../lib/i18n/config';

export function generateMetadata({ params }) {
  const t = makeT(getDictionary(params.lang));
  return { title: t('dist.title') + ' – InkForge' };
}

export default function DistributorsPage({ params }) {
  const t = makeT(getDictionary(params.lang));
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{t('dist.title')}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-400">{t('dist.intro')}</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        <Tile title={t('dist.tile1.title')} text={t('dist.tile1.text')} />
        <Tile title={t('dist.tile2.title')} text={t('dist.tile2.text')} />
        <Tile title={t('dist.tile3.title')} text={t('dist.tile3.text')} />
      </div>
    </main>
  );
}

function Tile({ title, text }) {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5">
      <h3 className="font-semibold text-amber-400">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-stone-400">{text}</p>
    </div>
  );
}
