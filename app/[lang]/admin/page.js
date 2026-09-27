// Admin fõoldal — NULLA import.
export default function AdminPage() {
  return (
    <div>
      <nav className="sticky top-0 z-40 border-b border-stone-800 bg-stone-950/95 px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <a href="/hu"><img src="/inkforge-logo.png" alt="InkForge" className="h-8 w-auto" /></a>
          <span className="ms-auto text-sm text-amber-400">Admin</span>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-2 text-sm text-stone-400">A Supabase kapcsolat utan aktivva valik.</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          <a href="/hu/admin/forgalmazok" className="rounded-xl border border-stone-800 bg-stone-900/40 p-6 hover:border-amber-600/60">
            <h2 className="font-semibold text-stone-200">Forgalmazok</h2>
          </a>
          <a href="/hu/admin/termekek" className="rounded-xl border border-stone-800 bg-stone-900/40 p-6 hover:border-amber-600/60">
            <h2 className="font-semibold text-stone-200">Termekek</h2>
          </a>
          <a href="/hu/admin/profilok" className="rounded-xl border border-stone-800 bg-stone-900/40 p-6 hover:border-amber-600/60">
            <h2 className="font-semibold text-stone-200">Profilok</h2>
          </a>
        </div>
      </main>
      <footer className="border-t border-stone-800 px-6 py-8 text-xs text-stone-600">
        <div className="mx-auto flex max-w-6xl justify-between gap-3">
          <span>InkForge B2B</span>
          <span>A feldolgozas a bongeszodben fut.</span>
        </div>
      </footer>
    </div>
  );
}
