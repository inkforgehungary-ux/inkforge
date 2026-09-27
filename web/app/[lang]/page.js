import { getDictionary, makeT } from '../../lib/i18n/config';

export function generateMetadata({ params }) {
  const t = makeT(getDictionary(params.lang));
  return { title: 'InkForge – ' + t('home.tagline') };
}

export default function HomePage({ params }) {
  const t = makeT(getDictionary(params.lang));
  const lang = params.lang;

  return (
    <main className="min-h-screen">
      <header className="relative w-full overflow-hidden">
        <img src="/fejlec-800.png" alt="InkForge" className="w-full h-auto block" />

        <div className="absolute bottom-0 start-0 end-0 px-6 pb-6 sm:pb-10">
          <div className="mx-auto max-w-6xl">
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white drop-shadow-lg">
              {t('home.title')}
            </h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-stone-300 drop-shadow">
              {t('home.subtitle')}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={`/${lang}/stencil`}
                className="rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-stone-950 transition hover:bg-amber-400">
                {t('home.cta.stencil')}
              </a>
              <a href={`/${lang}/piacter`}
                className="rounded-lg border border-stone-500 px-5 py-2.5 font-semibold text-stone-200 backdrop-blur transition hover:border-amber-500 hover:text-amber-400">
                {t('home.cta.marketplace')}
              </a>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-6 md:grid-cols-3">
          <Pillar n="01" title={t('pillar.stencil.title')} text={t('pillar.stencil.text')}
            href={`/${lang}/stencil`} cta={t('home.cta.stencil')} primary />
          <Pillar n="02" title={t('pillar.market.title')} text={t('pillar.market.text')}
            href={`/${lang}/piacter`} cta={t('home.cta.marketplace')} />
          <Pillar n="03" title={t('pillar.showcase.title')} text={t('pillar.showcase.text')}
            href={`/${lang}/studiok`} cta={t('nav.studios')} />
        </div>
      </section>

      <section className="border-y border-stone-800 bg-stone-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-xl font-semibold tracking-tight">{t('dist.tile1.title')}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-400">{t('dist.intro')}</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <Tile title={t('dist.tile1.title')} text={t('dist.tile1.text')} />
            <Tile title={t('dist.tile2.title')} text={t('dist.tile2.text')} />
            <Tile title={t('dist.tile3.title')} text={t('dist.tile3.text')} />
          </div>
          <a href={`/${lang}/forgalmazoknak`}
            className="mt-8 inline-block rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-stone-950 transition hover:bg-amber-400">
            {t('dist.form.title')}
          </a>
        </div>
      </section>
    </main>
  );
}

function Pillar({ n, title, text, href, cta, primary }) {
  return (
    <div className="flex flex-col rounded-xl border border-stone-800 bg-stone-900/40 p-6">
      <span className="text-xs font-semibold tracking-[0.2em] text-stone-600">{n}</span>
      <h3 className={`mt-3 text-lg font-semibold ${primary ? 'text-amber-400' : 'text-stone-200'}`}>{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-400">{text}</p>
      <a href={href}
        className={`mt-5 inline-block rounded-lg px-4 py-2 text-center text-sm font-medium transition ${
          primary ? 'bg-amber-500 text-stone-950 hover:bg-amber-400' : 'border border-stone-700 text-stone-200 hover:border-amber-500 hover:text-amber-400'
        }`}>
        {cta}
      </a>
    </div>
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
