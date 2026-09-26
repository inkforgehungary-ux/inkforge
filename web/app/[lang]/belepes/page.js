import AuthForm from '../../../components/AuthForm';

export function generateMetadata({ params }) {
  return { title: 'Belepes – InkForge' };
}

export default function LoginPage({ params }) {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-2xl border border-stone-800 bg-stone-900/40 p-7">
        <AuthForm mode="signin" onDone={() => { window.location.href = `/${params.lang}/stencil`; }} />
      </div>
    </main>
  );
}
