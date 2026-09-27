export default function HomeContent({ t, lang }) {
  const pillars = [
    [t.p1t, t.p1x, 'stencil', t.ctaStencil, true],
    [t.p2t, t.p2x, 'piacter', t.ctaMarket, false],
    [t.p3t, t.p3x, 'studiok', t.navStudios, false],
  ];
  const tiles = [[t.d1t, t.d1x], [t.d2t, t.d2x], [t.d3t, t.d3x]];
  return (
    <main className="min-h-screen">
      <header className="relative w-full overflow-hidden">
        <img src="/fejlec-800.png" alt="InkForge" className="w-full h-auto block" />
        <div className="absolute bottom-0 start-0 end-0 px-6 pb-6 sm:pb-10">
          <div className="mx-auto max-w-6xl">
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white drop-shadow-lg">{t.title}</h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-stone-300 drop-shadow">{t.subtitle}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={'/' + lang + '/stencil'} className="rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-stone-950 hover:bg-amber-400">{t.ctaStencil}</a>
              <a href={'/' + lang + '/piacter'} className="rounded-lg border border-stone-500 px-5 py-2.5 font-semibold text-stone-200 hover:border-amber-500 hover:text-amber-400">{t.ctaMarket}</a>
            </div>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-6 md:grid-cols-3">
          {pillars.map(function (p, idx) {
            return (
              <div key={p[2]} className="flex flex-col rounded-xl border border-stone-800 bg-stone-900/40 p-6">
                <span className="text-xs font-semibold tracking-[0.2em] text-stone-600">0{idx + 1}</span>
                <h3 className={'mt-3 text-lg font-semibold ' + (p[4] ? 'text-amber-400' : 'text-stone-200')}>{p[0]}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-400">{p[1]}</p>
                <a href={'/' + lang + '/' + p[2]} className={'mt-5 inline-block rounded-lg px-4 py-2 text-center text-sm font-medium ' + (p[4] ? 'bg-amber-500 text-stone-950 hover:bg-amber-400' : 'border border-stone-700 text-stone-200 hover:border-amber-500')}>{p[3]}</a>
              </div>
            );
          })}
        </div>
      </section>
      <section className="border-y border-stone-800 bg-stone-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-xl font-semibold tracking-tight">{t.d1t}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-400">{t.dIntro}</p>
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
          <a href={'/' + lang + '/forgalmazoknak'} className="mt-8 inline-block rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-stone-950 hover:bg-amber-400">{t.dCta}</a>
        </div>
      </section>
    </main>
  );
}
