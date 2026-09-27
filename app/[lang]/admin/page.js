import LocaleShell from '../../../components/LocaleShell';
import { getDictionary, makeT } from '../../lib/i18n/config';

export const metadata = { title: 'Admin - InkForge' };

export default function AdminPage({ params }) {
  const lang = params.lang;
  const t = makeT(getDictionary(lang));
  return (
    <LocaleShell lang={lang} t={t}>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-2 text-sm text-stone-400">
          Az admin felulet a Supabase kapcsolat utan valik aktivva.
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          <a href={'/' + lang + '/admin/forgalmazok'} className="rounded-xl border border-stone-800 bg-stone-900/40 p-6 hover:border-amber-600/60">
            <h2 className="font-semibold text-stone-200">Forgalmazok</h2>
          </a>
          <a href={'/' + lang + '/admin/termekek'} className="rounded-xl border border-stone-800 bg-stone-900/40 p-6 hover:border-amber-600/60">
            <h2 className="font-semibold text-stone-200">Termekek</h2>
          </a>
          <a href={'/' + lang + '/admin/profilok'} className="rounded-xl border border-stone-800 bg-stone-900/40 p-6 hover:border-amber-600/60">
            <h2 className="font-semibold text-stone-200">Profilok</h2>
          </a>
        </div>
      </main>
    </LocaleShell>
  );
}
