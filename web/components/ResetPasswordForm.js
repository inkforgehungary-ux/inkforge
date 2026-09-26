'use client';

import { useState } from 'react';
import { updatePassword } from '../lib/auth';
import { PasswordField } from './AuthForm';

export default function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const tokenFromHash = () => {
    if (typeof window === 'undefined') return null;
    const h = window.location.hash.replace(/^#/, '');
    if (!h) return null;
    return new URLSearchParams(h).get('access_token');
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setInfo('');
    if (password !== password2) { setErr('A ket jelszo nem egyezik.'); return; }
    setBusy(true);
    try {
      await updatePassword(password, tokenFromHash());
      setInfo('A jelszo megvaltozott. Most mar be tudsz jelentkezni az uj jelszoval.');
      setPassword(''); setPassword2('');
      setTimeout(() => { window.location.href = '/'; }, 2500);
    } catch (ex) { setErr(ex.message); }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <h1 className="text-xl font-semibold tracking-tight text-stone-100">Uj jelszo beallitasa</h1>
      <p className="text-sm text-stone-400">Add meg az uj jelszavadat.</p>

      <label className="block">
        <span className="text-xs text-stone-400">Uj jelszo</span>
        <div className="mt-1"><PasswordField value={password} onChange={setPassword} autoComplete="new-password" /></div>
      </label>
      <label className="block">
        <span className="text-xs text-stone-400">Uj jelszo megismetlese</span>
        <div className="mt-1"><PasswordField value={password2} onChange={setPassword2} autoComplete="new-password" /></div>
      </label>

      <button type="submit" disabled={busy}
        className="w-full rounded-lg bg-amber-500 px-4 py-2.5 font-semibold text-stone-950 transition hover:bg-amber-400 disabled:bg-stone-700 disabled:text-stone-400">
        {busy ? '…' : 'Jelszo mentese'}
      </button>

      {err && <p className="rounded-lg bg-red-950 px-3 py-2 text-xs text-red-300">{err}</p>}
      {info && <p className="rounded-lg bg-emerald-950 px-3 py-2 text-xs text-emerald-300">{info}</p>}
    </form>
  );
}
