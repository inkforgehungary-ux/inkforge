// Forgalmazoknak — NULLA import.
const TILES = [
  ['Nincs raktar, nincs logisztika', 'Szoftver es kapcsolat. Nincs keszlet, nincs szallitas, nincs visszaru.'],
  ['A rendeles hozzad megy', 'A vasarlo megrendel, a rendeles a te felteteleiddel nalad teljesul.'],
  ['Tobb kosarertek', 'Aki stencilt tervez, latja a kinalatodat. A papir es a szoftver egymast adjak el.'],
];

export default function DistributorsPage({ params }) {
  const lang = (params && params.lang) || 'hu';
  return (
    <div lang={lang}>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <a href={'/' + lang} className="text-sm text-stone-500 hover:text-amber-400">Vissza</a>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Forgalmazoknak</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-400">Tedd fel a kinalatodat. Ingyenes listazas, a rendelesek hozzad futnak be, a szallitas nalad marad.</p>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {TILES.map(function (x) {
            return (
              <div key={x[0]} className="rounded-xl border border-stone-800 bg-stone-900/40 p-5">
                <h3 className="font-semibold text-amber-400">{x[0]}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-400">{x[1]}</p>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
