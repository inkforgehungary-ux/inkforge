import Link from 'next/link';
import { getDictionary, makeT } from '../../lib/i18n/config';
import AdminNav from '../../components/AdminNav';

export function generateMetadata() {
  return { title: 'Admin – InkForge' };
}

export default function AdminPage({ params }) {
  const t = makeT(getDictionary(params.lang));
  const lang = params.lang;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-2 text-sm text-stone-400">
        Kezeld a forgalmazokat, a termekeket es a bemutatkozo profilokat.
      </p>

      <AdminNav lang={lang} active="" />

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          href={`/${lang}/admin/forgalmazok`}
          title="Forgalmazok"
          text="Partnerek felvetele, elerhetoseg, aktivitas. A termekeik ebbol a rekordbol jonnek."
        />
        <Card
          href={`/${lang}/admin/termekek`}
          title="Termekek"
          text="A piacter kinalata. Kategoria, ar, keszlet allapot, forgalmazo."
        />
        <Card
          href={`/${lang}/admin/profilok`}
          title="Profilok"
          text="Studiok es muveszek bemutatkozo oldalai: borito, galeria, video, stiluok."
        />
      </div>

      <div className="mt-10 rounded-xl border border-stone-800 bg-stone-900/40 p-6">
        <h2 className="font-semibold text-stone-200">Hogyan mukodik az adat</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-400">
          Az admin felulet a Supabase tablakra ir. A forgalmazo rekordja nelkul nincs termek,
          a termek nelkul nincs piacteri kartya. A profilok ugyanigy onalloak: egy rekord egy oldal.
        </p>
        <ul className="mt-4 space-y-1 text-sm text-stone-400">
          <li>· <code className="text-amber-400">distributors</code> — a partner</li>
          <li>· <code className="text-amber-400">product_categories</code> — a kilenc kategoria (fix)</li>
          <li>· <code className="text-amber-400">products</code> — a kinalat</li>
          <li>· <code className="text-amber-400">showcases</code> — studio vagy muvesz profil</li>
          <li>· <code className="text-amber-400">showcase_images</code> — a profil galeriaja</li>
        </ul>
      </div>
    </main>
  );
}

function Card({ href, title, text }) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-stone-800 bg-stone-900/40 p-6 transition hover:border-amber-600/60"
    >
      <h2 className="font-semibold text-stone-200 group-hover:text-amber-400">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-400">{text}</p>
    </Link>
  );
}
