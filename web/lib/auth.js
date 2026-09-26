// InkForge – Supabase auth kliens
// A bejelentkezes a Supabase Auth REST API-jan keresztul megy,
// a token a bongeszoben marad (localStorage).

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(URL && ANON);

const SESSION_KEY = 'inkforge.session';

export function getSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSession(s) {
  if (typeof window === 'undefined') return;
  if (s) window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else window.localStorage.removeItem(SESSION_KEY);
}

export async function signIn(email, password) {
  if (!isConfigured) throw new Error('Supabase nincs beallitva.');
  const res = await fetch(URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || 'Sikertelen bejelentkezes.');
  const session = { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user };
  saveSession(session);
  return session;
}

export async function signUp(email, password) {
  if (!isConfigured) throw new Error('Supabase nincs beallitva.');
  const res = await fetch(URL + '/auth/v1/signup', {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || 'Sikertelen regisztracio.');
  return data;
}

export async function signOut() {
  const s = getSession();
  if (s && isConfigured) {
    try {
      await fetch(URL + '/auth/v1/logout', {
        method: 'POST',
        headers: { apikey: ANON, Authorization: 'Bearer ' + s.access_token },
      });
    } catch { /* a helyi torles a lenyeg */ }
  }
  saveSession(null);
}

/** A bejelentkezett user tokenje, vagy null. */
export function getToken() {
  const s = getSession();
  return s ? s.access_token : null;
}
