'use client';

import { useState, useEffect } from 'react';
import { getSession, signOut } from '../lib/auth';

export default function AuthButton({ label }) {
  const [session, setSession] = useState(null);

  useEffect(() => {
    setSession(getSession());
    const onStorage = () => setSession(getSession());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!session) return null;

  return (
    <button onClick={async () => { await signOut(); setSession(null); window.location.reload(); }}
      title={session.user && session.user.email}
      className="rounded-lg border border-stone-700 px-3 py-1.5 text-xs text-stone-400 transition hover:border-red-600 hover:text-red-400">
      Kijelentkezes
    </button>
  );
}
