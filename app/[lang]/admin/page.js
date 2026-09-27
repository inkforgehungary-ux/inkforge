import { T, CATMAP, CODES } from '../_shared';
import StencilTool from '../components/StencilTool';
import Nav from '../components/Nav';

export function generateMetadata({ params }) {
  return { title: T(params.lang).tagline };
}

export default function AdminPage({ params }) {
  const lang = params.lang;
  const t = T(lang);
  return (
    <div lang={lang}>
      <Nav lang={lang} t={t} />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-2 text-sm text-stone-400">{t.adminNote}</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          <a href={'/' + lang + '/admin/forgalmazok'} className="rounded-xl border border-stone-800 bg-stone-900/40 p-6 hover:border-amber-600/60"><h2 className="font-semibold text-stone-200">Forgalmazok</h2></a>
          <a href={'/' + lang + '/admin/termekek'} className="rounded-xl border border-stone-800 bg-stone-900/40 p-6 hover:border-amber-600/60"><h2 className="font-semibold text-stone-200">Termekek</h2></a>
          <a href={'/' + lang + '/admin/profilok'} className="rounded-xl border border-stone-800 bg-stone-900/40 p-6 hover:border-amber-600/60"><h2 className="font-semibold text-stone-200">Profilok</h2></a>
        </div>
      </main>
      <footer className="border-t border-stone-800 px-6 py-8 text-xs text-stone-600">
        <div className="mx-auto flex max-w-6xl justify-between gap-3"><span>InkForge B2B</span><span>{t.foot}</span></div>
      </footer>
    </div>
  );
}
