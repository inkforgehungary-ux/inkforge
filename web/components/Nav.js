'use client';

import Link from 'next/link';
import { useState } from 'react';
import LanguageSwitcher from './LanguageSwitcher';

export default function Nav({ lang, t }) {
  const [open, setOpen] = useState(false);

  const items = [
    { href: `/${lang}/stencil`, label: t('nav.stencil') },
    { href: `/${lang}/piacter`, label: t('nav.marketplace') },
    { href: `/${lang}/studiok`, label: t('nav.studios') },
    { href: `/${lang}/muveszek`, label: t('nav.artists') },
    { href: `/${lang}/forgalmazoknak`, label: t('nav.distributors') },
    { href: `/${lang}/kapcsolat`, label: t('nav.contact') },
  ];

  return (
    <nav className="sticky top-0 z-40 border-b border-stone-800 bg-stone-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
        <Link href={`/${lang}`} className="flex items-center gap-2">
          <img src="/api/static/inkforge-logo.png" alt="InkForge" className="h-8 w-auto" />
        </Link>

        <div className="ml-auto hidden items-center gap-1 md:flex">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="rounded-lg px-3 py-2 text-sm text-stone-300 transition hover:bg-stone-800 hover:text-amber-400"
            >
              {it.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto md:ml-2">
          <LanguageSwitcher current={lang} label={t('common.lang')} />
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-stone-700 px-3 py-2 text-sm text-stone-300 md:hidden"
          aria-label="Menu"
        >
          ☰
        </button>
      </div>

      {open && (
        <div className="border-t border-stone-800 bg-stone-950 md:hidden">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={() => setOpen(false)}
              className="block px-6 py-3 text-sm text-stone-300 transition hover:bg-stone-900 hover:text-amber-400"
            >
              {it.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
