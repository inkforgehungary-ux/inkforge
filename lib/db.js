const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

export const isConfigured = Boolean(URL && KEY);

function requireConfig() {
  if (!isConfigured) {
    throw new Error('Supabase nincs beallitva.');
  }
}

export const db = {
  list: async function (table, query) {
    requireConfig();

    const safeTable = String(table || '').trim();
    if (!/^[A-Za-z0-9_]+$/.test(safeTable)) {
      throw new Error('Ervenytelen tabla nev.');
    }

    const search = query ? '&' + query : '';
    const response = await fetch(URL + '/rest/v1/' + safeTable + '?select=*' + search, {
      headers: {
        apikey: KEY,
        Authorization: 'Bearer ' + KEY,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const body = await response.text().catch(function () { return ''; });
      throw new Error('Supabase hiba ' + response.status + (body ? ': ' + body.slice(0, 180) : ''));
    }

    return response.json();
  },
};
