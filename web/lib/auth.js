// InkForge – Supabase auth kliens
// Bejelentkezes, regisztracio, jelszo-visszaallitas, kijelentkezes.

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
  if (!res.ok) throw new Error(translateAuthError(data));
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
  if (!res.ok) throw new Error(translateAuthError(data));
  if (data.access_token) {
    saveSession({ access_token: data.access_token, refresh_token: data.refresh_token, user: data.user });
  }
  return data;
}

export async function requestPasswordReset(email) {
  if (!isConfigured) throw new Error('Supabase nincs beallitva.');
  const redirectTo = typeof window !== 'undefined' ? window.location.origin + '/reset-password' : undefined;
  const res = await fetch(URL + '/auth/v1/recover', {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, options: { redirectTo } }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(translateAuthError(data));
  }
  return true;
}

export async function updatePassword(newPassword, accessToken) {
  if (!isConfigured) throw new Error('Supabase nincs beallitva.');
  const token = accessToken || getToken();
  if (!token) throw new Error('Hianyzik a visszaallito token.');
  const res = await fetch(URL + '/auth/v1/user', {
    method: 'PUT',
    headers: { apikey: ANON, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(translateAuthError(data));
  saveSession(null);
  return true;
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

export function getToken() {
  const s = getSession();
  return s ? s.access_token : null;
}

function translateAuthError(data) {
  const msg = (data && (data.error_description || data.msg || data.error || data.message)) || '';
  const m = String(msg).toLowerCase();
  if (m.includes('invalid login')) return 'Hibas e-mail vagy jelszo.';
  if (m.includes('email not confirmed')) return 'Az e-mail cim meg nincs megerositve. Nezd meg a postaladat.';
  if (m.includes('already registered')) return 'Ez az e-mail cim mar regisztralva van.';
  if (m.includes('password') && m.includes('least')) return 'A jelszo legalabb 6 karakter legyen.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Tul sok probalkozas. Varj egy percet.';
  return msg || 'Varatlan hiba. Probald ujra.';
}
