'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import { getSession, signOut } from '../lib/auth';

export default function Nav({ lang, t }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    setSession(getSession());
    const onStorage = () => setSession(getSession());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const items = [
    { href: `/${lang}/stencil`, label: t('nav.stencil') },
    { href: `/${lang}/piacter`, label: t('nav.marketplace') },
    { href: `/${lang}/studiok`, label: t('nav.studios') },
    { href: `/${lang}/muveszek`, label: t('nav.artists') },
    { href: `/${lang}/forgalmazoknak`, label: t('nav.distributors') },
    { href: `/${lang}/kapcsolat`, label: t('nav.contact') },
  ];

  const logout = async () => {
    await signOut();
    setSession(null);
    window.location.href = `/${lang}`;
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-stone-800 bg-stone-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-6 py-3">
        <Link href={`/${lang}`} className="flex items-center gap-2">
          <img src="/api/static/inkforge-logo.png" alt="InkForge" className="h-8 w-auto" />
        </Link>

        <div className="ms-auto hidden items-center gap-1 lg:flex">
          {items.map((it) => (
            <Link key={it.href} href={it.href}
              className="rounded-lg px-3 py-2 text-sm text-stone-300 transition hover:bg-stone-800 hover:text-amber-400">
              {it.label}
            </Link>
          ))}
        </div>

        <div className="ms-auto flex items-center gap-2 lg:ms-2">
          {session ? (
            <>
              <Link href={`/${lang}/admin`}
                className="rounded-lg border border-stone-700 px-3 py-1.5 text-xs text-stone-400 transition hover:border-amber-500 hover:text-amber-400">
                Admin
              </Link>
              <button onClick={logout}
                className="rounded-lg border border-stone-700 px-3 py-1.5 text-xs text-stone-400 transition hover:border-red-600 hover:text-red-400">
                Kijelentkezes
              </button>
            </>
          ) : (
            <Link href={`/${lang}/belepes`}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-stone-950 transition hover:bg-amber-400">
              Bejelentkezes
            </Link>
          )}
          <LanguageSwitcher current={lang} label={t('common.lang')} />
        </div>

        <button onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-stone-700 px-3 py-2 text-sm text-stone-300 lg:hidden"
          aria-label="Menu">☰</button>
      </div>

      {open && (
        <div className="border-t border-stone-800 bg-stone-950 lg:hidden">
          {items.map((it) => (
            <Link key={it.href} href={it.href} onClick={() => setOpen(false)}
              className="block px-6 py-3 text-sm text-stone-300 transition hover:bg-stone-900 hover:text-amber-400">
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
