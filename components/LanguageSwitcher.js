'use client';

import { useState } from 'react';

export default function LanguageSwitcher({ current }) {
  const [open, setOpen] = useState(false);
  const codes = ['hu','en','de','fr','es','it','pt','nl','pl','cs','sk','ro','tr','ru','ja','ko','zh','th','ar','he'];
  return (
    <span className="relative inline-block">
      <button onClick={function () { setOpen(!open); }} className="rounded-lg border border-stone-700 px-3 py-1.5 text-xs text-stone-300">
        {current.toUpperCase()}
      </button>
      {open && (
        <span className="absolute end-0 z-50 mt-1 block max-h-60 w-40 overflow-y-auto rounded-lg border border-stone-700 bg-stone-900 py-1 shadow-xl">
          {codes.map(function (c) {
            return (
              <a key={c} href={'/' + c} className={'block px-3 py-1.5 text-xs hover:bg-stone-800 ' + (c === current ? 'text-amber-400' : 'text-stone-300')}>
                {c.toUpperCase()}
              </a>
            );
          })}
        </span>
      )}
    </span>
  );
}
