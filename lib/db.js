// InkForge – Supabase kliens
// Az uj Supabase projektek a PUBLISHABLE_KEY nevet hasznaljak (a regi ANON_KEY helyett).
// Mindkettot tamogatjuk, hogy a kod ne torjon el.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

export const isConfigured = Boolean(URL && KEY);

function rest(path, options) {
  const o = options || {};
  return fetch(URL + '/rest/v1/' + path, Object.assign({}, o, {
    headers: Object.assign({
      apikey: KEY,
      Authorization: 'Bearer ' + KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }, o.headers || {}),
    cache: 'no-store',
  })).then(function (res) {
    if (!res.ok) {
      return res.text().then(function (t) {
        throw new Error(res.status + ': ' + t.slice(0, 300));
      });
    }
    return res.text().then(function (t) { return t ? JSON.parse(t) : null; });
  });
}

export const db = {
  list: function (table, query) { return rest(table + '?select=*' + (query ? '&' + query : '')); },
  insert: function (table, row) { return rest(table, { method: 'POST', body: JSON.stringify(row) }); },
  update: function (table, id, row) { return rest(table + '?id=eq.' + id, { method: 'PATCH', body: JSON.stringify(row) }); },
  remove: function (table, id) { return rest(table + '?id=eq.' + id, { method: 'DELETE' }); },
};
