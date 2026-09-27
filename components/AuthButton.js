'use client';

import { useState, useEffect } from 'react';
import { getSession } from '../lib/auth';

export default function AuthButton({ label, lang }) {
  const [session, setSession] = useState(null);

  useEffect(() => {
    setSession(getSession());
    const onStorage = () => setSession(getSession());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!session) {
    return (
      <a href={`/${lang}/belepes`}
        className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-stone-950 hover:bg-amber-400">
        {label || 'Bejelentkezes'}
      </a>
    );
  }

  return (
    <a href={`/${lang}/admin`}
      className="rounded-lg border border-stone-700 px-3 py-1.5 text-xs text-stone-400 hover:border-amber-500 hover:text-amber-400">
      Admin
    </a>
  );
}
