// Stencil oldal — NULLA import.
export default function StencilPage({ params }) {
  const lang = (params && params.lang) || 'hu';
  return (
    <div lang={lang}>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <a href={'/' + lang} className="text-sm text-stone-500 hover:text-amber-400">Vissza</a>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Stencil generalasa</h1>
        <p className="mt-2 text-sm text-stone-400">Toltsd fel a kepet, allitsd be a meretet, es a motor elvegzi a tobbit.</p>
        <div className="mt-8 rounded-xl border-2 border-dashed border-stone-700 p-10 text-center">
          <p className="text-stone-300">Huzd ide a kepet, vagy kattints</p>
          <p className="mt-1 text-xs text-stone-500">PNG, JPG - fekete-feher rajz adja a legjobb eredmenyt</p>
        </div>
        <div className="mt-6 rounded-xl border border-amber-700/50 bg-amber-950/30 px-5 py-4 text-sm text-amber-200">
          A feltolto felulet es a motor bekotese a kovetkezo lepesben jon.
        </div>
      </main>
    </div>
  );
}
