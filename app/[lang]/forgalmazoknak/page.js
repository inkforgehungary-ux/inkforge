import { getDictionary, makeT } from '../../../lib/i18n/config';
import LocaleShell from '../../../components/LocaleShell';

export function generateMetadata({ params }) {
  const t = makeT(getDictionary(params.lang));
  return { title: t('dist.title') + ' - InkForge' };
}

export default function DistributorsPage({ params }) {
  const lang = params.lang;
  const t = makeT(getDictionary(lang));
  return (
    <LocaleShell lang={lang} t={t}>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">{t('dist.title')}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-400">{t('dist.intro')}</p>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {[1, 2, 3].map(function (i) {
            return (
              <div key={i} className="rounded-xl border border-stone-800 bg-stone-900/40 p-5">
                <h2 className="font-semibold text-amber-400">{t('dist.tile' + i + '.title')}</h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-400">{t('dist.tile' + i + '.text')}</p>
              </div>
            );
          })}
        </div>
      </main>
    </LocaleShell>
  );
}
