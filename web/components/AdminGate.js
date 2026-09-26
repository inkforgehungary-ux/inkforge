'use client';

import { useEffect, useState } from 'react';
import { getSession, signIn, signOut } from '../lib/auth';
import Link from 'next/link';

export default function AdminGate({ lang, children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSession(getSession());
    setReady(true);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const s = await signIn(email, password);
      setSession(s);
    } catch (ex) { setErr(ex.message); }
    setBusy(false);
  };

  const logout = async () => {
    await signOut();
    setSession(null);
  };

  if (!ready) return null;

  if (!session) {
    return (
      <div className="mt-8 max-w-md">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400">
          Bejelentkezes
        </h2>
        <p className="mt-2 text-sm text-stone-500">
          Az admin felulet csak bejelentkezve szerkesztheto.
        </p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block">
            <span className="text-xs text-stone-400">E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-200" />
          </label>
          <label className="block">
            <span className="text-xs text-stone-400">Jelszo</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-200" />
          </label>
          <button type="submit" disabled={busy}
            className="w-full rounded-lg bg-amber-500 px-4 py-2.5 font-semibold text-stone-950 transition hover:bg-amber-400 disabled:bg-stone-700 disabled:text-stone-400">
            {busy ? 'Bejelentkezes…' : 'Bejelentkezes'}
          </button>
          {err && <p className="rounded-lg bg-red-950 px-3 py-2 text-xs text-red-300">{err}</p>}
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-stone-800 bg-stone-900/40 px-4 py-3 text-sm">
        <span className="text-stone-400">Bejelentkezve:</span>
        <span className="font-medium text-stone-200">{session.user?.email}</span>
        <button onClick={logout} className="ms-auto text-xs text-stone-400 hover:text-red-400">
          Kijelentkezes
        </button>
      </div>
      {children}
    </>
  );
}
