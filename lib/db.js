const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

export const isConfigured = Boolean(URL && KEY);

export const db = {
  list: function (table, query) {
    return fetch(URL + '/rest/v1/' + table + '?select=*' + (query ? '&' + query : ''), {
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY },
      cache: 'no-store',
    }).then(function (r) { return r.ok ? r.json() : Promise.reject(new Error(String(r.status))); });
  },
};
