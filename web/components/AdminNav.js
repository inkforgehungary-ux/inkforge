'use client';

import Link from 'next/link';

export default function AdminNav({ lang, active }) {
  const items = [
    { key: '', href: `/${lang}/admin`, label: 'Attekintes' },
    { key: 'forgalmazok', href: `/${lang}/admin/forgalmazok`, label: 'Forgalmazok' },
    { key: 'termekek', href: `/${lang}/admin/termekek`, label: 'Termekek' },
    { key: 'profilok', href: `/${lang}/admin/profilok`, label: 'Profilok' },
  ];

  return (
    <nav className="mt-6 flex flex-wrap gap-2 border-b border-stone-800 pb-4">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          className={`rounded-lg px-4 py-2 text-sm transition ${
            active === it.key
              ? 'bg-amber-500 font-semibold text-stone-950'
              : 'border border-stone-700 text-stone-300 hover:border-amber-500 hover:text-amber-400'
          }`}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
