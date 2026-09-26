import ResetPasswordForm from '../../components/ResetPasswordForm';

export const metadata = { title: 'Uj jelszo – InkForge' };

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-2xl border border-stone-800 bg-stone-900/40 p-7">
        <ResetPasswordForm />
      </div>
    </main>
  );
}
