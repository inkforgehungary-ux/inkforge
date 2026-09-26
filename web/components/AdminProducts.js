'use client';

import { useEffect, useState } from 'react';
import { db, isConfigured } from '../lib/db';

const EMPTY = { distributor_id: '', category_id: '', name: '', slug: '', brand: '', price: '', currency: 'HUF', stock_status: 'unknown', description_hu: '', description_en: '', external_url: '', is_active: true };

export default function AdminProducts() {
  const [rows, setRows] = useState([]);
  const [dists, setDists] = useState([]);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const [p, d, c] = await Promise.all([
        db.list('products', 'order=created_at.desc'),
        db.list('distributors', 'is_active=eq.true'),
        db.list('product_categories', 'order=sort_order.asc'),
      ]);
      setRows(p || []); setDists(d || []); setCats(c || []);
    } catch (e) { setMsg(e.message); }
  };

  useEffect(() => { if (isConfigured) load(); }, []);

  const save = async () => {
    try {
      const row = { ...form };
      if (!row.slug) row.slug = slugify(row.name);
      row.price = row.price === '' ? null : Number(row.price);
      row.category_id = row.category_id === '' ? null : Number(row.category_id);
      if (editing) await db.update('products', editing, row);
      else await db.insert('products', row);
      setForm(EMPTY); setEditing(null); await load(); setMsg('Mentve.');
    } catch (e) { setMsg(e.message); }
  };

  const edit = (r) => { setEditing(r.id); setForm({ ...EMPTY, ...r }); };
  const del = async (r) => {
    if (!confirm('Toroljuk: ' + r.name + '?')) return;
    try { await db.remove('products', r.id); await load(); } catch (e) { setMsg(e.message); }
  };

  if (!isConfigured) return <NotConfigured />;

  const distName = (id) => (dists.find((d) => d.id === id) || {}).name || '—';
  const catName = (id) => (cats.find((c) => c.id === id) || {}).name_hu || '—';

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400">
          Termekek ({rows.length})
        </h2>
        {rows.length === 0 && <p className="mt-4 text-sm text-stone-500">Meg nincs termek.</p>}
        <div className="mt-4 space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="flex items-start gap-4 rounded-xl border border-stone-800 bg-stone-900/40 p-4">
              <div className="flex-1">
                <span className="font-medium text-stone-200">{r.name}</span>
                <p className="mt-1 text-xs text-stone-500">
                  {distName(r.distributor_id)} · {catName(r.category_id)}
                  {r.price != null ? ' · ' + r.price + ' ' + r.currency : ''}
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
          {editing ? 'Szerkesztes' : 'Uj termek'}
        </h2>
        <div className="mt-4 space-y-3">
          <Select label="Forgalmazo" value={form.distributor_id}
            onChange={(v) => setForm({ ...form, distributor_id: v })}
            options={dists.map((d) => ({ value: d.id, label: d.name }))} />
          <Select label="Kategoria" value={form.category_id}
            onChange={(v) => setForm({ ...form, category_id: v })}
            options={cats.map((c) => ({ value: c.id, label: c.name_hu }))} />
          <Field label="Nev" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Marka" value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ar" value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
            <Field label="Valuta" value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} />
          </div>
          <Select label="Keszlet" value={form.stock_status}
            onChange={(v) => setForm({ ...form, stock_status: v })}
            options={[{ value: 'in_stock', label: 'Raktaron' }, { value: 'out_of_stock', label: 'Elfogyott' }, { value: 'unknown', label: 'Ismeretlen' }]} />
          <Field label="Kulso link" value={form.external_url} onChange={(v) => setForm({ ...form, external_url: v })} />
          <label className="flex items-center gap-2 text-sm text-stone-300">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="accent-amber-500" />
            Aktiv
          </label>
          <div className="flex gap-2 pt-2">
            <button onClick={save} disabled={!form.name || !form.distributor_id}
              className="flex-1 rounded-lg bg-amber-500 px-4 py-2.5 font-semibold text-stone-950 transition hover:bg-amber-400 disabled:bg-stone-700 disabled:text-stone-400">
              Mentés
            </button>
            {editing && (
              <button onClick={() => { setEditing(null); setForm(EMPTY); }}
                className="rounded-lg border border-stone-700 px-4 py-2.5 text-sm text-stone-300">Megse</button>
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

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-xs text-stone-400">{label}</span>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200">
        <option value="">—</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function NotConfigured() {
  return (
    <p className="mt-8 rounded-xl border border-amber-700/50 bg-amber-950/30 px-5 py-4 text-sm text-amber-200">
      A Supabase nincs beallitva. Add meg a kornyezeti valtozokat a Vercelen.
    </p>
  );
}

function slugify(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
