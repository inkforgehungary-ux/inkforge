'use client';

import { useState } from 'react';
import { signIn, signOut, getSession } from '../lib/auth';

/** A fejlecben megjeleno bejelentkezes-kezelo. */
export default function AuthButton({ label }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(typeof window !== 'undefined' ? getSession() : null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      setSession(await signIn(email, password));
      setOpen(false);
      setEmail(''); setPassword('');
    } catch (ex) { setErr(ex.message); }
    setBusy(false);
  };

  const logout = async () => { await signOut(); setSession(null); };

  return (
    <div className="relative">
      {session ? (
        <button onClick={logout} title={session.user?.email}
          className="rounded-lg border border-stone-700 px-3 py-1.5 text-xs text-stone-400 transition hover:border-red-600 hover:text-red-400">
          Kijelentkezes
        </button>
      ) : (
        <>
          <button onClick={() => setOpen((v) => !v)}
            className="rounded-lg border border-stone-700 px-3 py-1.5 text-xs text-stone-400 transition hover:border-amber-500 hover:text-amber-400">
            {label || 'Bejelentkezes'}
          </button>
          {open && (
            <form onSubmit={submit}
              className="absolute end-0 z-50 mt-2 w-64 space-y-2 rounded-lg border border-stone-700 bg-stone-900 p-4 shadow-xl">
              <input type="email" placeholder="E-mail" value={email} required
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-200" />
              <input type="password" placeholder="Jelszo" value={password} required
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-200" />
              <button type="submit" disabled={busy}
                className="w-full rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-400 disabled:bg-stone-700">
                {busy ? '…' : 'Belepes'}
              </button>
              {err && <p className="text-xs text-red-400">{err}</p>}
            </form>
          )}
        </>
      )}
    </div>
  );
}
