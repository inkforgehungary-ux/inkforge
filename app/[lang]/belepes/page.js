import { getDictionary, makeT } from '../../../lib/i18n/config';
import LocaleShell from '../../../components/LocaleShell';

export function generateMetadata({ params }) {
  const t = makeT(getDictionary(params.lang));
  return { title: t('login.title') + ' - InkForge' };
}

export default function LoginPage({ params }) {
  const lang = params.lang;
  const t = makeT(getDictionary(lang));

  return (
    <LocaleShell lang={lang} t={t}>
      <main className="mx-auto max-w-md px-6 py-16">
        <div className="rounded-2xl border border-stone-800 bg-stone-900/40 p-7">
          <h1 className="text-xl font-semibold tracking-tight text-stone-100">{t('login.title')}</h1>
          <p className="mt-3 text-sm text-stone-400">{t('login.intro')}</p>
          <a
            href={'/' + lang + '/stencil'}
            className="mt-5 inline-block rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-stone-950 hover:bg-amber-400"
          >
            {t('login.goStencil')}
          </a>
        </div>
      </main>
    </LocaleShell>
  );
}
