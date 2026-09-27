import LanguageSwitcher from './LanguageSwitcher';
import AuthButton from './AuthButton';

export default function Nav({ lang, t }) {
  const items = [
    { href: '/' + lang + '/stencil', label: t('nav.stencil') },
    { href: '/' + lang + '/piacter', label: t('nav.marketplace') },
    { href: '/' + lang + '/studiok', label: t('nav.studios') },
    { href: '/' + lang + '/muveszek', label: t('nav.artists') },
    { href: '/' + lang + '/forgalmazoknak', label: t('nav.distributors') },
    { href: '/' + lang + '/kapcsolat', label: t('nav.contact') },
  ];
  return (
    <nav className="sticky top-0 z-40 border-b border-stone-800 bg-stone-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-6 py-3">
        <a href={'/' + lang} className="flex items-center gap-2">
          <img src="/inkforge-logo.png" alt="InkForge" className="h-8 w-auto" />
        </a>
        <div className="ms-auto hidden items-center gap-1 lg:flex">
          {items.map(function (it) {
            return (
              <a key={it.href} href={it.href} className="rounded-lg px-3 py-2 text-sm text-stone-300 hover:bg-stone-800 hover:text-amber-400">
                {it.label}
              </a>
            );
          })}
        </div>
        <div className="ms-auto flex items-center gap-2 lg:ms-2">
          <AuthButton label={t('nav.login')} lang={lang} />
          <LanguageSwitcher current={lang} />
        </div>
      </div>
    </nav>
  );
}
