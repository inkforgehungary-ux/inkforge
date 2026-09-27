// Fõoldal — NULLA import. Minden szoveg es a teljes felulet ebben a fajlban.

const S = {
  hu: {
    title: 'Az otletedbol tiszta sablon',
    sub: 'A studioud sajat stencil-muhelye. Feltoltott kepbol nyomtatasra kesz sablon, pontos mm-merettel.',
    ctas: 'Stencil generalasa', ctam: 'Piacter felfedezese',
    n1: 'Stencil', n2: 'Piacter', n3: 'Studiok', n4: 'Muveszek', n5: 'Forgalmazoknak', n6: 'Kapcsolat', login: 'Bejelentkezes',
    p1t: 'Stencil-tervezes', p1x: 'Ez az egyetlen dolog, amit mi csinalunk. Feltoltott kepbol nyomtatasra kesz sablon, pontos mm-merettel.',
    p2t: 'Piacter', p2x: 'Forgalmazok termekei egy helyen - a tutol a szekig. A szallitas a forgalmazoe, mi a kapcsolatot adjuk.',
    p3t: 'Studiok es muveszek', p3x: 'Bemutatkozo profilok: munkak, videok, stilusok, elerhetoseg.',
    d1t: 'Nincs raktar, nincs logisztika', d1x: 'Szoftver es kapcsolat. Nincs keszlet, nincs szallitas, nincs visszaru.',
    d2t: 'A rendeles hozzad megy', d2x: 'A vasarlo megrendel, a rendeles a te felteteleiddel nalad teljesul.',
    d3t: 'Tobb kosarertek', d3x: 'Aki stencilt tervez, latja a kinalatodat. A papir es a szoftver egymast adjak el.',
    dIntro: 'Tedd fel a kinalatodat. Ingyenes listazas, a rendelesek hozzad futnak be, a szallitas nalad marad.',
    dCta: 'Jelentkezes', foot: 'A feldolgozas a bongeszodben fut, a kep nem kerul szerverre.'
  },
  en: {
    title: 'From idea to a clean stencil',
    sub: 'Your studio own stencil workshop. Print-ready stencils with exact millimetre sizing.',
    ctas: 'Generate a stencil', ctam: 'Explore the marketplace',
    n1: 'Stencil', n2: 'Marketplace', n3: 'Studios', n4: 'Artists', n5: 'For distributors', n6: 'Contact', login: 'Sign in',
    p1t: 'Stencil design', p1x: 'The one thing we do ourselves. From an uploaded image to a print-ready stencil.',
    p2t: 'Marketplace', p2x: 'Distributor products in one place - from needles to chairs.',
    p3t: 'Studios and artists', p3x: 'Showcase profiles: work, videos, styles, contact.',
    d1t: 'No warehouse, no logistics', d1x: 'Software and connection. No stock, no shipping, no returns.',
    d2t: 'Orders go to you', d2x: 'The buyer orders, the order is fulfilled by you under your terms.',
    d3t: 'Higher basket value', d3x: 'Whoever designs a stencil sees your catalogue.',
    dIntro: 'List your catalogue. Free listing, orders come to you.',
    dCta: 'Application', foot: 'Processing runs in your browser.'
  }
};

const CODES = ['hu','en','de','fr','es','it','pt','nl','pl','cs','sk','ro','tr','ru','ja','ko','zh','th','ar','he'];

export function generateStaticParams() {
  return CODES.map(function (lang) { return { lang: lang }; });
}

export default function HomePage({ params }) {
  const lang = (params && params.lang) || 'hu';
  const t = S[lang] || S.hu;
  const dir = lang === 'ar' || lang === 'he' ? 'rtl' : 'ltr';

  const nav = [
    ['stencil', t.n1], ['piacter', t.n2], ['studiok', t.n3],
    ['muveszek', t.n4], ['forgalmazoknak', t.n5], ['kapcsolat', t.n6]
  ];
  const pillars = [
    [t.p1t, t.p1x, 'stencil', t.ctas, true],
    [t.p2t, t.p2x, 'piacter', t.ctam, false],
    [t.p3t, t.p3x, 'studiok', t.n3, false]
  ];
  const tiles = [[t.d1t, t.d1x], [t.d2t, t.d2x], [t.d3t, t.d3x]];

  return (
    <div dir={dir} lang={lang}>
      <nav className="sticky top-0 z-40 border-b border-stone-800 bg-stone-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-6 py-3">
          <a href={'/' + lang}><img src="/inkforge-logo.png" alt="InkForge" className="h-8 w-auto" /></a>
          <div className="ms-auto hidden items-center gap-1 lg:flex">
            {nav.map(function (it) {
              return <a key={it[0]} href={'/' + lang + '/' + it[0]} className="rounded-lg px-3 py-2 text-sm text-stone-300 hover:bg-stone-800 hover:text-amber-400">{it[1]}</a>;
            })}
          </div>
          <div className="ms-auto flex items-center gap-2 lg:ms-2">
            <a href={'/' + lang + '/belepes'} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-stone-950 hover:bg-amber-400">{t.login}</a>
            <span className="hidden rounded-lg border border-stone-700 px-2 py-1.5 text-[10px] text-stone-500 sm:inline-block">
              {CODES.map(function (c) {
                return <a key={c} href={'/' + c} className={c === lang ? 'text-amber-400' : 'text-stone-500'}>{c.toUpperCase()}&nbsp;</a>;
              })}
            </span>
          </div>
        </div>
      </nav>

      <main className="min-h-screen">
        <header className="relative w-full overflow-hidden">
          <img src="/fejlec-800.png" alt="InkForge" className="w-full h-auto block" />
          <div className="absolute bottom-0 start-0 end-0 px-6 pb-6 sm:pb-10">
            <div className="mx-auto max-w-6xl">
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white drop-shadow-lg">{t.title}</h1>
              <p className="mt-2 max-w-2xl text-sm sm:text-base text-stone-300 drop-shadow">{t.sub}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a href={'/' + lang + '/stencil'} className="rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-stone-950 hover:bg-amber-400">{t.ctas}</a>
                <a href={'/' + lang + '/piacter'} className="rounded-lg border border-stone-500 px-5 py-2.5 font-semibold text-stone-200 hover:border-amber-500 hover:text-amber-400">{t.ctam}</a>
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
                  <a href={'/' + lang + '/' + p[2]} className={'mt-5 inline-block rounded-lg px-4 py-2 text-center text-sm font-medium ' + (p[4] ? 'bg-amber-500 text-stone-950 hover:bg-amber-400' : 'border border-stone-700 text-stone-200 hover:border-amber-500 hover:text-amber-400')}>{p[3]}</a>
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

      <footer className="border-t border-stone-800 px-6 py-8 text-xs text-stone-600">
        <div className="mx-auto flex max-w-6xl justify-between gap-3">
          <span>InkForge B2B</span>
          <span>{t.foot}</span>
        </div>
      </footer>
    </div>
  );
}
