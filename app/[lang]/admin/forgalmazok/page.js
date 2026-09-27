import { T } from '../../../_shared';

export default function Page({ params }) {
  const lang = params.lang;
  const t = T(lang);
  return (
    <div lang={lang}>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <a href={'/' + lang + '/admin'} className="text-sm text-stone-500 hover:text-amber-400">{t.back}</a>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Forgalmazok</h1>
        <p className="mt-6 text-sm text-stone-500">{t.adminNote}</p>
      </main>
    </div>
  );
}
