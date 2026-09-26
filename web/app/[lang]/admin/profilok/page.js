import { getDictionary, makeT } from '../../../lib/i18n/config';
import AdminNav from '../../../components/AdminNav';
import AdminShowcases from '../../../components/AdminShowcases';

export function generateMetadata() {
  return { title: 'Profilok – Admin · InkForge' };
}

export default function AdminShowcasesPage({ params }) {
  const t = makeT(getDictionary(params.lang));
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Profilok</h1>
      <AdminNav lang={params.lang} active="profilok" />
      <AdminShowcases />
    </main>
  );
}
