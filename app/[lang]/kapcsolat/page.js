// Kapcsolat — NULLA import.
export default function ContactPage({ params }) {
  const lang = (params && params.lang) || 'hu';
  return (
    <div lang={lang}>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <a href={'/' + lang} className="text-sm text-stone-500 hover:text-amber-400">Vissza</a>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Kapcsolat</h1>
        <p className="mt-2 text-sm text-stone-400">Irj, es valaszolunk.</p>
        <p className="mt-8 rounded-xl border border-stone-800 bg-stone-900/40 px-5 py-6 text-sm text-stone-300">inkforge.hungary@gmail.com</p>
      </main>
    </div>
  );
}
