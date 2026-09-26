import { getDictionary, makeT } from '../../../lib/i18n/config';
import AdminNav from '../../../components/AdminNav';
import AdminProducts from '../../../components/AdminProducts';

export function generateMetadata() {
  return { title: 'Termekek – Admin · InkForge' };
}

export default function AdminProductsPage({ params }) {
  const t = makeT(getDictionary(params.lang));
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Termekek</h1>
      <AdminNav lang={params.lang} active="termekek" />
      <AdminProducts />
    </main>
  );
}
