'use client';

import { useEffect, useState } from 'react';
import { db, isConfigured } from '../lib/db';

const EMPTY = { kind: 'studio', name: '', slug: '', city: '', country: '', styles: '', bio_hu: '', bio_en: '', instagram: '', website: '', email: '', video_url: '', is_active: true, sort_order: 0 };

export default function AdminShowcases() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try { setRows(await db.list('showcases', 'order=sort_order.asc')); }
    catch (e) { setMsg(e.message); }
  };

  useEffect(() => { if (isConfigured) load(); }, []);

  const save = async () => {
    try {
      const row = { ...form };
      if (!row.slug) row.slug = slugify(row.name);
      row.styles = row.styles ? String(row.styles).split(',').map((s) => s.trim()).filter(Boolean) : null;
      if (editing) await db.update('showcases', editing, row);
      else await db.insert('showcases', row);
      setForm(EMPTY); setEditing(null); await load(); setMsg('Mentve.');
    } catch (e) { setMsg(e.message); }
  };

  const edit = (r) => {
    setEditing(r.id);
    setForm({ ...EMPTY, ...r, styles: (r.styles || []).join(', ') });
  };
  const del = async (r) => {
    if (!confirm('Toroljuk: ' + r.name + '?')) return;
    try { await db.remove('showcases', r.id); await load(); } catch (e) { setMsg(e.message); }
  };

  if (!isConfigured) return <NotConfigured />;

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400">
          Profilok ({rows.length})
        </h2>
        {rows.length === 0 && <p className="mt-4 text-sm text-stone-500">Meg nincs profil.</p>}
        <div className="mt-4 space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="flex items-start gap-4 rounded-xl border border-stone-800 bg-stone-900/40 p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-stone-800 px-2 py-0.5 text-xs text-stone-400">
                    {r.kind === 'studio' ? 'Studio' : 'Muvesz'}
                  </span>
                  <span className="font-medium text-stone-200">{r.name}</span>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  {r.city || '—'}{r.country ? ', ' + r.country : ''} · {(r.styles || []).join(', ') || 'nincs stiluok'}
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
          {editing ? 'Szerkesztes' : 'Uj profil'}
        </h2>
        <div className="mt-4 space-y-3">
          <Select label="Tipus" value={form.kind} onChange={(v) => setForm({ ...form, kind: v })}
            options={[{ value: 'studio', label: 'Studio' }, { value: 'artist', label: 'Muvesz' }]} />
          <Field label="Nev" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Slug (URL)" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="auto" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Varos" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
            <Field label="Orszag" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
          </div>
          <Field label="Stiluok (vesszovel)" value={form.styles} onChange={(v) => setForm({ ...form, styles: v })} placeholder="realisztikus, blackwork" />
          <Field label="Instagram" value={form.instagram} onChange={(v) => setForm({ ...form, instagram: v })} />
          <Field label="Weboldal" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
          <Field label="E-mail" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Video URL" value={form.video_url} onChange={(v) => setForm({ ...form, video_url: v })} placeholder="https://youtube.com/..." />
          <label className="block">
            <span className="text-xs text-stone-400">Bemutatkozas (HU)</span>
            <textarea rows={3} value={form.bio_hu || ''} onChange={(e) => setForm({ ...form, bio_hu: e.target.value })}
              className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-200" />
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-300">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="accent-amber-500" />
            Aktiv
          </label>
          <div className="flex gap-2 pt-2">
            <button onClick={save} disabled={!form.name}
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
