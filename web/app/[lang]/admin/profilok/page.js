import LocaleShell from '../../../../components/LocaleShell';
import AdminNav from '../../../../components/AdminNav';
import AdminGate from '../../../../components/AdminGate';
import AdminShowcases from '../../../../components/AdminShowcases';

export const metadata = { title: 'Profilok – Admin' };

export default function Page({ params }) {
  return (
    <LocaleShell lang={params.lang}>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Profilok</h1>
        <AdminGate lang={params.lang}>
          <AdminNav lang={params.lang} active="profilok" />
          <AdminShowcases />
        </AdminGate>
      </main>
    </LocaleShell>
  );
}
