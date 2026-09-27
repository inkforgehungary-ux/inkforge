import Nav from './Nav';

export default function LocaleShell({ lang, t, children }) {
  return (
    <>
      <Nav lang={lang} t={t} />
      {children}
      <footer className="border-t border-stone-800 px-6 py-8 text-xs text-stone-600">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <span>InkForge · Tattoo Stencil Platform · B2B</span>
          <span>{t('footer.note')}</span>
        </div>
      </footer>
    </>
  );
}
