// Belepes — NULLA import.
export default function LoginPage({ params }) {
  const lang = (params && params.lang) || 'hu';
  return (
    <div lang={lang}>
      <main className="mx-auto max-w-md px-6 py-16">
        <div className="rounded-2xl border border-stone-800 bg-stone-900/40 p-7">
          <h1 className="text-xl font-semibold tracking-tight text-stone-100">Bejelentkezes</h1>
          <p className="mt-3 text-sm text-stone-400">A bejelentkezes es a regisztracio a kovetkezo lepesben jon.</p>
          <a href={'/' + lang + '/stencil'} className="mt-5 inline-block rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-stone-950 hover:bg-amber-400">Stencil generalasa</a>
        </div>
      </main>
    </div>
  );
}
