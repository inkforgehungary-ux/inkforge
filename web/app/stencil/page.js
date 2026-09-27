import StencilTool from '../../components/StencilTool';
import AuthGate from '../../components/AuthGate';
import LocaleShell from '../components/LocaleShell';
import { getDictionary, makeT } from '../lib/i18n/config';

export const metadata = { title: 'Stencil – InkForge' };

export default function StencilHuPage() {
  const t = makeT(getDictionary('hu'));
  return (
    <LocaleShell lang="hu">
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">{t('stencil.title')}</h1>
        <p className="mt-2 text-sm text-stone-400">{t('stencil.intro')}</p>
        <AuthGate title="Stencil generalas — bejelentkezes szukseges"
          subtitle="A stencil generalashoz fiok kell. Regisztralj ingyen, vagy jelentkezz be.">
          <StencilTool t={t} />
        </AuthGate>
      </main>
    </LocaleShell>
  );
}
