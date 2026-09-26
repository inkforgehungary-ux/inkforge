// InkForge – a Supabase kliens
// A kulcsok a kornyezeti valtozokbol jonnek (Vercel: Settings -> Environment Variables).

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(URL && ANON);

async function rest(path, options = {}) {
  if (!isConfigured) throw new Error('A Supabase nincs beallitva (hianyzo kornyezeti valtozok).');
  const res = await fetch(URL + '/rest/v1/' + path, {
    ...options,
    headers: {
      apikey: ANON,
      Authorization: 'Bearer ' + ANON,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(res.status + ': ' + text.slice(0, 300));
  }
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;
}

export const db = {
  list: (table, query = '') => rest(table + '?select=*' + (query ? '&' + query : '')),
  insert: (table, row) => rest(table, { method: 'POST', body: JSON.stringify(row) }),
  update: (table, id, row) => rest(table + '?id=eq.' + id, { method: 'PATCH', body: JSON.stringify(row) }),
  remove: (table, id) => rest(table + '?id=eq.' + id, { method: 'DELETE' }),
};
