// InkForge - auth
const KEY = 'inkforge.session';

export function getSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

export function signOut() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
}

export const isConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
