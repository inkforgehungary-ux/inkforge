'use client';

import Link from 'next/link';
import { useState } from 'react';

// Nav linkek: a fooldal es a nyilvanos oldalak.
// Az admin linket csak bejelentkezve mutatjuk (a session a localStorage-ban van).

import { getSession } from '../lib/auth';
import { useEffect } from 'react';

export function useIsLoggedIn() {
  const [logged, setLogged] = useState(false);
  useEffect(() => { setLogged(Boolean(getSession())); }, []);
  return logged;
}
