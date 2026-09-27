'use client';

import { useState } from 'react';
import { LOCALES } from '../lib/i18n/config';

export default function LanguageSwitcher({ current, label }) {
  const [open, setOpen] = useState(false);

  const switchTo = (code) => {
    setOpen(false);
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length && LOCALES.some((l) => l.code === parts[0])) parts[0] = code;
    else parts.unshift(code);
    window.location.href = '/' + parts.join('/');
  };

  const active = LOCALES.find((l) => l.code === current) || LOCALES[0];

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-stone-700 px-3 py-1.5 text-sm text-stone-300 hover:border-amber-500 hover:text-amber-400">
        <span>{active.flag}</span>
        <span className="hidden sm:inline">{active.code.toUpperCase()}</span>
        <span className="text-xs text-stone-500">v</span>
      </button>
      {open && (
        <div className="absolute end-0 z-50 mt-2 max-h-80 w-56 overflow-y-auto rounded-lg border border-stone-700 bg-stone-900 py-1 shadow-xl">
          {LOCALES.map((l) => (
            <button key={l.code} onClick={() => switchTo(l.code)}
              className={`flex w-full items-center gap-3 px-3 py-2 text-start text-sm hover:bg-stone-800 ${
                l.code === current ? 'text-amber-400' : 'text-stone-300'
              }`}>
              <span>{l.flag}</span>
              <span>{l.name}</span>
              <span className="ms-auto text-xs text-stone-500">{l.code.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
