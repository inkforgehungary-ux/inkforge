'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '../lib/auth';
import AuthForm from './AuthForm';

/** A gyerekeket csak bejelentkezve mutatja. */
export default function AuthGate({ children, title, subtitle }) {
  const [session, setSession] = useState(undefined);
  const router = useRouter();

  const check = () => setSession(getSession());

  useEffect(() => {
    check();
    window.addEventListener('storage', check);
    return () => window.removeEventListener('storage', check);
  }, []);

  if (session === undefined) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-700 border-t-amber-500" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto mt-16 max-w-md px-6">
        <div className="rounded-2xl border border-stone-800 bg-stone-900/40 p-7">
          <h1 className="text-xl font-semibold tracking-tight text-stone-100">
            {title || 'Bejelentkezes szukseges'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-400">
            {subtitle || 'A platform hasznalatahoz fiok kell. Regisztralj, vagy jelentkezz be.'}
          </p>
          <div className="mt-6">
            <AuthForm onDone={() => { check(); router.refresh(); }} compact />
          </div>
        </div>
      </div>
    );
  }

  return children;
}
