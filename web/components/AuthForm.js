'use client';

import { useState } from 'react';
import { signIn, signUp, requestPasswordReset } from '../lib/auth';

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export function PasswordField({ value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        minLength={6}
        className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 pe-11 text-sm text-stone-200"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        tabIndex={-1}
        aria-label={show ? 'Jelszo elrejtese' : 'Jelszo megjelenitese'}
        className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-stone-500 transition hover:text-amber-400"
      >
        <EyeIcon open={show} />
      </button>
    </div>
  );
}

export default function AuthForm({ mode: initialMode = 'signin', onDone, compact }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => { setErr(''); setInfo(''); };

  const submit = async (e) => {
    e.preventDefault();
    reset();
    if (mode !== 'forgot' && password !== password2) {
      setErr('A ket jelszo nem egyezik.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        if (onDone) onDone();
      } else if (mode === 'signup') {
        await signUp(email, password);
        setInfo('Regisztracio elkeszult. Nezd meg a postaladat, es erositsd meg az e-mail cimedet, majd jelentkezz be.');
        setMode('signin');
        setPassword(''); setPassword2('');
      } else {
        await requestPasswordReset(email);
        setInfo('Elkuldjuk a jelszo-visszaallito levelet. Nezd meg a postaladat.');
      }
    } catch (ex) {
      setErr(ex.message);
    }
    setBusy(false);
  };

  const titles = { signin: 'Bejelentkezes', signup: 'Regisztracio', forgot: 'Elfelejtett jelszo' };

  return (
    <form onSubmit={submit} className="space-y-3">
      <h2 className={`font-semibold text-stone-200 ${compact ? 'text-sm' : 'text-lg'}`}>{titles[mode]}</h2>

      <label className="block">
        <span className="text-xs text-stone-400">E-mail</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
          className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-200" />
      </label>

      {mode !== 'forgot' && (
        <>
          <label className="block">
            <span className="text-xs text-stone-400">Jelszo</span>
            <div className="mt-1">
              <PasswordField value={password} onChange={setPassword}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
            </div>
          </label>
          <label className="block">
            <span className="text-xs text-stone-400">Jelszo megismetlese</span>
            <div className="mt-1">
              <PasswordField value={password2} onChange={setPassword2} autoComplete="new-password" />
            </div>
          </label>
        </>
      )}

      <button type="submit" disabled={busy}
        className="w-full rounded-lg bg-amber-500 px-4 py-2.5 font-semibold text-stone-950 transition hover:bg-amber-400 disabled:bg-stone-700 disabled:text-stone-400">
        {busy ? '…' : titles[mode]}
      </button>

      {err && <p className="rounded-lg bg-red-950 px-3 py-2 text-xs text-red-300">{err}</p>}
      {info && <p className="rounded-lg bg-emerald-950 px-3 py-2 text-xs text-emerald-300">{info}</p>}

      <div className="flex flex-wrap justify-between gap-2 pt-1 text-xs">
        {mode !== 'signin' && (
          <button type="button" onClick={() => { reset(); setMode('signin'); }} className="text-stone-400 hover:text-amber-400">
            Mar van fiokom — belepes
          </button>
        )}
        {mode !== 'signup' && (
          <button type="button" onClick={() => { reset(); setMode('signup'); }} className="text-stone-400 hover:text-amber-400">
            Nincs fiokom — regisztracio
          </button>
        )}
        {mode !== 'forgot' && (
          <button type="button" onClick={() => { reset(); setMode('forgot'); }} className="text-stone-400 hover:text-amber-400">
            Elfelejtett jelszo?
          </button>
        )}
      </div>
    </form>
  );
}
