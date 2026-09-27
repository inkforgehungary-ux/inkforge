// Piacter — NULLA import.
const HU = ['Gepek','Tuk','Festekek','Stencilpapir','Stencil-kiegeszitok','Higienia','Butor','Utankezeles','Egyeb'];
const EN = ['Machines','Needles','Inks','Stencil paper','Stencil supplies','Hygiene','Furniture','Aftercare','Other'];

export default function MarketPage({ params }) {
  const lang = (params && params.lang) || 'hu';
  const list = lang === 'hu' ? HU : EN;
  return (
    <div lang={lang}>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <a href={'/' + lang} className="text-sm text-stone-500 hover:text-amber-400">Vissza</a>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{lang === 'hu' ? 'Piacter' : 'Marketplace'}</h1>
        <p className="mt-2 max-w-3xl text-sm text-stone-400">Forgalmazok termekei egy helyen - a tutol a szekig.</p>
        <p className="mt-6 rounded-xl border border-amber-700/50 bg-amber-950/30 px-5 py-4 text-sm text-amber-200">A szallitas a forgalmazoe. Mi a kapcsolatot adjuk, a rendelest a partner teljesiti.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map(function (c) {
            return (
              <div key={c} className="rounded-xl border border-stone-800 bg-stone-900/40 p-5">
                <h2 className="font-semibold text-stone-200">{c}</h2>
                <span className="mt-3 inline-block text-xs text-stone-500">Hamarosan</span>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
