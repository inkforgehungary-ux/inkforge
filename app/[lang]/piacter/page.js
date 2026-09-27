import { getDictionary, makeT } from '../../lib/i18n/config';
import LocaleShell from '../../../components/LocaleShell';

const CATS = ['machines','needles','inks','paper','stencil','hygiene','furniture','aftercare','other'];

export function generateMetadata({ params }) {
  const t = makeT(getDictionary(params.lang));
  return { title: t('market.title') + ' - InkForge' };
}

export default function MarketplacePage({ params }) {
  const lang = params.lang;
  const t = makeT(getDictionary(lang));
  return (
    <LocaleShell lang={lang} t={t}>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">{t('market.title')}</h1>
        <p className="mt-2 max-w-3xl text-sm text-stone-400">{t('market.intro')}</p>
        <p className="mt-6 rounded-xl border border-amber-700/50 bg-amber-950/30 px-5 py-4 text-sm text-amber-200">
          {t('market.shipping')}
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATS.map(function (c) {
            return (
              <a key={c} href={'/' + lang + '/piacter/' + c}
                className="group rounded-xl border border-stone-800 bg-stone-900/40 p-5 hover:border-amber-600/60">
                <h2 className="font-semibold text-stone-200 group-hover:text-amber-400">{t('market.cat.' + c)}</h2>
                <span className="mt-3 inline-block text-xs text-stone-500">{t('market.soon')}</span>
              </a>
            );
          })}
        </div>
      </main>
    </LocaleShell>
  );
}
