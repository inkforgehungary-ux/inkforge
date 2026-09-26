'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '../lib/auth';

/** Ha nincs bejelentkezve, atharmit a belepes oldalra. */
export default function RequireAuth({ lang, children }) {
  const [ok, setOk] = useState(undefined);
  const router = useRouter();

  useEffect(() => {
    const s = getSession();
    if (!s) { router.replace(`/${lang}/belepes`); return; }
    setOk(true);
  }, [lang, router]);

  if (ok === undefined) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-700 border-t-amber-500" />
      </div>
    );
  }
  return children;
}
