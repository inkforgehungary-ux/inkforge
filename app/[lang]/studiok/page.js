// Studiok — NULLA import.
export default function StudiosPage({ params }) {
  const lang = (params && params.lang) || 'hu';
  return (
    <div lang={lang}>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <a href={'/' + lang} className="text-sm text-stone-500 hover:text-amber-400">Vissza</a>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Studiok</h1>
        <p className="mt-2 max-w-3xl text-sm text-stone-400">Bemutatkozo profilok: munkak, videok, stilusok, elerhetoseg.</p>
        <p className="mt-8 rounded-xl border border-stone-800 bg-stone-900/40 px-5 py-8 text-center text-sm text-stone-500">Hamarosan</p>
      </main>
    </div>
  );
}
