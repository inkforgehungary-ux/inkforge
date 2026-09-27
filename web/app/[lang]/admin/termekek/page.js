import LocaleShell from '../../../../components/LocaleShell';
import AdminNav from '../../../../components/AdminNav';
import AdminGate from '../../../../components/AdminGate';
import AdminProducts from '../../../../components/AdminProducts';

export const metadata = { title: 'Termekek – Admin' };

export default function Page({ params }) {
  return (
    <LocaleShell lang={params.lang}>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Termekek</h1>
        <AdminGate lang={params.lang}>
          <AdminNav lang={params.lang} active="termekek" />
          <AdminProducts />
        </AdminGate>
      </main>
    </LocaleShell>
  );
}
