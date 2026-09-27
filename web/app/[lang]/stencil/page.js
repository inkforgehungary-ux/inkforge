import { getDictionary, makeT, getFontClass } from '../../../lib/i18n/config';
import LocaleShell from '../../../../components/LocaleShell';
import StencilTool from '../../../../components/StencilTool';
import AuthGate from '../../../../components/AuthGate';

export function generateMetadata({ params }) {
  const t = makeT(getDictionary(params.lang));
  return { title: t('stencil.title') + ' – InkForge' };
}

export default function StencilPage({ params }) {
  const lang = params.lang;
  const t = makeT(getDictionary(lang));
  const fontClass = getFontClass(lang);
  const dir = lang === 'ar' || lang === 'he' ? 'rtl' : 'ltr';

  return (
    <div className={fontClass} dir={dir} lang={lang}>
      <LocaleShell lang={lang} t={t}>
        <main className="mx-auto max-w-5xl px-6 py-12">
          <h1 className="text-2xl font-semibold tracking-tight">{t('stencil.title')}</h1>
          <p className="mt-2 text-sm text-stone-400">{t('stencil.intro')}</p>
          <AuthGate
            title="Stencil generalas — bejelentkezes szukseges"
            subtitle="A stencil generalashoz fiok kell. Regisztralj ingyen, vagy jelentkezz be.">
            <StencilTool t={t} />
          </AuthGate>
        </main>
      </LocaleShell>
    </div>
  );
}
