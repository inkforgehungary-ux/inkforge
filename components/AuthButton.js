'use client';

import { useState } from 'react';

export default function AuthButton({ label, lang }) {
  const [shown, setShown] = useState(false);
  return (
    <span className="relative inline-block">
      <a href={'/' + lang + '/belepes'} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-stone-950 hover:bg-amber-400">
        {label}
      </a>
      <button type="button" onClick={function () { setShown(!shown); }} className="ms-2 text-xs text-stone-500 hover:text-amber-400">
        {shown ? 'rejt' : 'szem'}
      </button>
    </span>
  );
}
