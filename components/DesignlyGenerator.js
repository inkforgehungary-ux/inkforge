'use client';

import { useState } from 'react';

export default function DesignlyGenerator({ lang='hu' }) {
  const [prompt,setPrompt]=useState('');
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState(null);
  const [error,setError]=useState('');

  async function generate() {
    if (!prompt.trim()) return setError('Írd le, milyen weboldalt szeretnél.');
    setBusy(true); setError(''); setResult(null);
    try {
      const r=await fetch('/api/designly/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        mode:'designly.website_generate',
        prompt,
        project:{name:'designly-test',version:1},
        brand:{colors:['#050505','#FFFFFF','#D4AF37','#00AEEF']}
      })});
      const data=await r.json();
      if(!r.ok || !data.ok) throw new Error(data.error || 'A generálás sikertelen.');
      setResult(data);
    } catch(e) { setError(e.message || 'Hiba történt.'); }
    finally { setBusy(false); }
  }

  return <section className="mt-10 rounded-3xl border border-amber-500/30 bg-stone-900/70 p-6 md:p-8">
    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Designly AI Website Builder</div>
    <h2 className="mt-2 text-2xl font-bold">Írd le a weboldalt, és felépítjük a projektet</h2>
    <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={5}
      placeholder="Példa: Prémium fekete-arany tetováló stúdió weboldal galériával, művész bemutatással, árakkal és időpontfoglalással."
      className="mt-5 w-full rounded-2xl border border-stone-700 bg-stone-950 p-4 text-sm text-white outline-none focus:border-amber-500"/>
    <button onClick={generate} disabled={busy} className="mt-4 rounded-xl bg-amber-500 px-5 py-3 font-bold text-stone-950 disabled:opacity-50">
      {busy ? 'AI weboldal generálása…' : 'Weboldal generálása'}
    </button>
    {error && <div className="mt-4 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">{error}</div>}
    {result && <div className="mt-6 space-y-4">
      <div className="rounded-2xl border border-stone-700 bg-stone-950 p-4">
        <div className="text-xs text-stone-500">Projekt</div>
        <div className="font-semibold">{result.project?.project_name || 'Designly project'}</div>
        <div className="mt-3 text-xs text-stone-500">Generált fájlok</div>
        <div className="mt-1 text-sm text-stone-300">{(result.project?.files || []).map(f=>f.path).join(' · ')}</div>
      </div>
      <pre className="max-h-80 overflow-auto rounded-2xl border border-stone-800 bg-black p-4 text-xs text-stone-300">{JSON.stringify({website_plan:result.artifacts?.website_plan,site_graph:result.artifacts?.site_graph,build:result.build},null,2)}</pre>
    </div>}
  </section>;
}
