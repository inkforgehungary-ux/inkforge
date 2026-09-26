'use client';

import Link from 'next/link';
import { useState } from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import AuthButton from './AuthButton';

export default function Nav({ lang, t }) {
  const [open, setOpen] = useState(false);

  const items = [
    { href: `/${lang}/stencil`, label: t('nav.stencil') },
    { href: `/${lang}/piacter`, label: t('nav.marketplace') },
    { href: `/${lang}/studios`, label: t('nav.studios') },
    { href: `/${lang}/muveszek`, label: t('nav.artists') },
    { href: `/${lang}/forgalmazoknak`, label: t('nav.distributors') },
    { href: `/${lang}/kapcsolat`, label: t('nav.contact') },
  ];

  return (
    <nav className="sticky top-0 z-40 border-b border-stone-800 bg-stone-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-6 py-3">
        <Link href={`/${lang}`} className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/api/static/inkforge-logo.png" alt="InkForge" className="h-8 w-auto" />
        </Link>

        <div className="ms-auto hidden items-center gap-1 lg:flex">
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

        <div className="ms-auto flex items-center gap-2 lg:ms-2">
          <AuthButton label={t('nav.login')} />
          <LanguageSwitcher current={lang} label={t('common.lang')} />
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-stone-700 px-3 py-2 text-sm text-stone-300 lg:hidden"
          aria-label="Menu"
        >
          ☰
        </button>
      </div>

      {open && (
        <div className="border-t border-stone-800 bg-stone-950 lg:hidden">
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
          <Link href={`/${lang}/admin`} onClick={() => setOpen(false)}
            className="block border-t border-stone-800 px-6 py-3 text-sm text-stone-500 transition hover:text-amber-400">
            Admin
          </Link>
        </div>
      )}
    </nav>
  );
}
