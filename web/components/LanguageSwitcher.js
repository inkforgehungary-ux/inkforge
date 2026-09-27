'use client';

import { useState } from 'react';

export default function LanguageSwitcher({ current }) {
  const [open, setOpen] = useState(false);
  const codes = ['hu','en','de','fr','es','it','pt','nl','pl','cs','sk','ro','tr','ru','ja','ko','zh','th','ar','he'];
  const switchTo = function (code) {
    setOpen(false);
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length && codes.indexOf(parts[0]) >= 0) parts[0] = code;
    else parts.unshift(code);
    window.location.href = '/' + parts.join('/');
  };
  return (
    <div className="relative">
      <button onClick={function () { setOpen(!open); }} className="rounded-lg border border-stone-700 px-3 py-1.5 text-sm text-stone-300 hover:border-amber-500 hover:text-amber-400">
        {current.toUpperCase()}
      </button>
      {open && (
        <div className="absolute end-0 z-50 mt-2 max-h-80 w-56 overflow-y-auto rounded-lg border border-stone-700 bg-stone-900 py-1 shadow-xl">
          {codes.map(function (c) {
            return (
              <button key={c} onClick={function () { switchTo(c); }} className={'flex w-full items-center px-3 py-2 text-start text-sm hover:bg-stone-800 ' + (c === current ? 'text-amber-400' : 'text-stone-300')}>
                {c.toUpperCase()}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
