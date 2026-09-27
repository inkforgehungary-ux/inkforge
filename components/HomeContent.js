export default function HomeContent({ t, lang }) {
  const pillars = [
    {
      key: 'stencil',
      title: t('pillar.stencil.title'),
      text: t('pillar.stencil.text'),
      href: 'stencil',
      cta: t('home.cta.stencil'),
      primary: true,
    },
    {
      key: 'marketplace',
      title: t('pillar.market.title'),
      text: t('pillar.market.text'),
      href: 'piacter',
      cta: t('home.cta.marketplace'),
      primary: false,
    },
    {
      key: 'showcase',
      title: t('pillar.showcase.title'),
      text: t('pillar.showcase.text'),
      href: 'studiok',
      cta: t('nav.studios'),
      primary: false,
    },
  ];

  const tiles = [
    [t('dist.tile1.title'), t('dist.tile1.text')],
    [t('dist.tile2.title'), t('dist.tile2.text')],
    [t('dist.tile3.title'), t('dist.tile3.text')],
  ];

  return (
    <main className="min-h-screen">
      <header className="relative w-full overflow-hidden">
        <picture>
          <source media="(min-width: 1400px)" srcSet="/fejlec-1920.png" />
          <source media="(min-width: 900px)" srcSet="/fejlec-1200.png" />
          <img src="/fejlec-800.png" alt="InkForge" className="block h-auto w-full" />
        </picture>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/90 via-stone-950/35 to-transparent px-6 pb-6 sm:pb-10">
          <div className="mx-auto max-w-6xl">
            <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-lg sm:text-4xl">
              {t('home.title')}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-stone-200 drop-shadow sm:text-base">
              {t('home.subtitle')}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={'/' + lang + '/stencil'} className="rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-stone-950 hover:bg-amber-400">
                {t('home.cta.stencil')}
              </a>
              <a href={'/' + lang + '/piacter'} className="rounded-lg border border-stone-400 bg-stone-950/30 px-5 py-2.5 font-semibold text-stone-100 hover:border-amber-500 hover:text-amber-400">
                {t('home.cta.marketplace')}
              </a>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-6 md:grid-cols-3">
          {pillars.map(function (p, idx) {
            return (
              <div key={p.key} className="flex flex-col rounded-xl border border-stone-800 bg-stone-900/40 p-6">
                <span className="text-xs font-semibold tracking-[0.2em] text-stone-600">0{idx + 1}</span>
                <h2 className={'mt-3 text-lg font-semibold ' + (p.primary ? 'text-amber-400' : 'text-stone-200')}>
                  {p.title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-400">{p.text}</p>
                <a
                  href={'/' + lang + '/' + p.href}
                  className={'mt-5 inline-block rounded-lg px-4 py-2 text-center text-sm font-medium ' + (p.primary ? 'bg-amber-500 text-stone-950 hover:bg-amber-400' : 'border border-stone-700 text-stone-200 hover:border-amber-500')}
                >
                  {p.cta}
                </a>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-y border-stone-800 bg-stone-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-xl font-semibold tracking-tight">{t('dist.title')}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-400">{t('dist.intro')}</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {tiles.map(function (x) {
              return (
                <div key={x[0]} className="rounded-xl border border-stone-800 bg-stone-900/40 p-5">
                  <h3 className="font-semibold text-amber-400">{x[0]}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-400">{x[1]}</p>
                </div>
              );
            })}
          </div>
          <a href={'/' + lang + '/forgalmazoknak'} className="mt-8 inline-block rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-stone-950 hover:bg-amber-400">
            {t('dist.form.title')}
          </a>
        </div>
      </section>
    </main>
  );
}
