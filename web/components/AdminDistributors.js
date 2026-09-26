'use client';

import { useEffect, useState } from 'react';
import { db, isConfigured } from '../lib/db';

const EMPTY = { name: '', slug: '', website: '', email: '', country: '', description_hu: '', description_en: '', is_active: true };

export default function AdminDistributors() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setRows(await db.list('distributors', 'order=created_at.desc'));
    } catch (e) { setMsg(e.message); }
  };

  useEffect(() => { if (isConfigured) load(); }, []);

  const save = async () => {
    setBusy(true); setMsg('');
    try {
      const row = { ...form };
      if (!row.slug) row.slug = slugify(row.name);
      if (editing) await db.update('distributors', editing, row);
      else await db.insert('distributors', row);
      setForm(EMPTY); setEditing(null); await load();
      setMsg('Mentve.');
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  };

  const edit = (r) => { setEditing(r.id); setForm({ ...EMPTY, ...r }); };
  const del = async (r) => {
    if (!confirm('Toroljuk: ' + r.name + '?')) return;
    try { await db.remove('distributors', r.id); await load(); } catch (e) { setMsg(e.message); }
  };

  if (!isConfigured) return <NotConfigured />;

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400">
          Partnerek ({rows.length})
        </h2>
        {rows.length === 0 && <p className="mt-4 text-sm text-stone-500">Meg nincs forgalmazo.</p>}
        <div className="mt-4 space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="flex items-start gap-4 rounded-xl border border-stone-800 bg-stone-900/40 p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-stone-200">{r.name}</span>
                  {!r.is_active && <span className="rounded bg-stone-800 px-2 py-0.5 text-xs text-stone-400">inaktiv</span>}
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  {r.slug} {r.country ? '· ' + r.country : ''} {r.website ? '· ' + r.website : ''}
                </p>
              </div>
              <button onClick={() => edit(r)} className="text-xs text-stone-400 hover:text-amber-400">Szerkeszt</button>
              <button onClick={() => del(r)} className="text-xs text-stone-400 hover:text-red-400">Torol</button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-stone-800 bg-stone-900/40 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400">
          {editing ? 'Szerkesztes' : 'Uj forgalmazo'}
        </h2>
        <div className="mt-4 space-y-3">
          <Field label="Nev" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Slug (URL)" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="auto" />
          <Field label="Weboldal" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
          <Field label="E-mail" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Orszag" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
          <label className="flex items-center gap-2 text-sm text-stone-300">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="accent-amber-500" />
            Aktiv
          </label>
          <div className="flex gap-2 pt-2">
            <button onClick={save} disabled={busy || !form.name}
              className="flex-1 rounded-lg bg-amber-500 px-4 py-2.5 font-semibold text-stone-950 transition hover:bg-amber-400 disabled:bg-stone-700 disabled:text-stone-400">
              Mentés
            </button>
            {editing && (
              <button onClick={() => { setEditing(null); setForm(EMPTY); }}
                className="rounded-lg border border-stone-700 px-4 py-2.5 text-sm text-stone-300">
                Megse
              </button>
            )}
          </div>
          {msg && <p className="text-xs text-amber-400">{msg}</p>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="text-xs text-stone-400">{label}</span>
      <input value={value || ''} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-200" />
    </label>
  );
}

function NotConfigured() {
  return (
    <p className="mt-8 rounded-xl border border-amber-700/50 bg-amber-950/30 px-5 py-4 text-sm text-amber-200">
      A Supabase nincs beallitva. Add meg a <code>NEXT_PUBLIC_SUPABASE_URL</code> es{' '}
      <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> kornyezeti valtozokat a Vercelen.
    </p>
  );
}

function slugify(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
