// Forgalmazok admin — NULLA import.
export default function Page() {
  return (
    <div>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <a href="/hu/admin" className="text-sm text-stone-500 hover:text-amber-400">Vissza</a>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Forgalmazok</h1>
        <p className="mt-6 text-sm text-stone-500">A Supabase kapcsolat utan aktiv.</p>
      </main>
    </div>
  );
}
