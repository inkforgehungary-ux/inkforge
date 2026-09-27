import LocaleShell from '../../../../components/LocaleShell';
import { getDictionary, makeT } from '../../../lib/i18n/config';

export const metadata = { title: 'Profilok - Admin' };

export default function Page({ params }) {
  const lang = params.lang;
  const t = makeT(getDictionary(lang));
  return (
    <LocaleShell lang={lang} t={t}>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Profilok</h1>
        <p className="mt-6 text-sm text-stone-500">A Supabase kapcsolat utan aktiv.</p>
      </main>
    </LocaleShell>
  );
}
