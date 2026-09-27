export default function LocaleShell({ lang, t, dir, children }) {
  return (
    <div dir={dir || 'ltr'} lang={lang}>
      {children}
    </div>
  );
}
