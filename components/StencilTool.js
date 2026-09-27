'use client';

import { useState, useRef, useCallback } from 'react';

export default function StencilTool({ t }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const onPick = useCallback(function (f) {
    if (!f || !f.type.startsWith('image/')) { setError('Csak kepfajl toltheto fel.'); return; }
    setFile(f); setError(''); setResult(null);
  }, []);

  const process = useCallback(async function () {
    if (!file) return;
    setBusy(true); setError('');
    try {
      const m = await import('../lib/stencil-client');
      const res = await m.runStencil(file, { widthMm: 100, dpi: 300 });
      setResult({ mask: res.mask, width: res.width, height: res.height, report: res.report, print: res.print, url: m.maskToDataURL(res.mask, res.width, res.height) });
    } catch (e) { setError(e.message || 'Hiba a feldolgozas kozben.'); }
    setBusy(false);
  }, [file]);

  const download = async function () {
    if (!result) return;
    const m = await import('../lib/stencil-client');
    m.downloadMask(result.mask, result.width, result.height, 'inkforge-stencil.png');
  };

  const r = result && result.report;
  const p = result && result.print;

  return (
    <div className="mt-8 grid gap-8 md:grid-cols-2">
      <div>
        <div onClick={function () { if (inputRef.current) inputRef.current.click(); }} className="cursor-pointer rounded-xl border-2 border-dashed border-stone-700 p-8 text-center hover:border-stone-500">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={function (e) { onPick(e.target.files && e.target.files[0]); }} />
          <p className="text-stone-300">{t.stDrop}</p>
          <p className="mt-1 text-xs text-stone-500">{t.stHint}</p>
          {file && <p className="mt-2 text-xs text-amber-400">{file.name}</p>}
        </div>
        <button onClick={process} disabled={!file || busy} className="mt-6 w-full rounded-lg bg-amber-500 px-4 py-3 font-semibold text-stone-950 hover:bg-amber-400 disabled:bg-stone-700 disabled:text-stone-400">
          {busy ? t.stWork : t.stGo}
        </button>
        {error && <p className="mt-3 rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
      </div>
      <div className="rounded-xl border border-stone-800 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400">{t.stRes}</h2>
        {!result && !busy && <p className="mt-4 text-sm text-stone-500">{t.stEmpty}</p>}
        {busy && <p className="mt-4 text-sm text-stone-400">{t.stWork}</p>}
        {result && (
          <div>
            <img src={result.url} alt="" className="mt-4 w-full rounded-lg border border-stone-700 bg-white" />
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <S label={t.stSize} value={p.widthMm + ' x ' + p.heightMm + ' mm'} />
              <S label={t.stDpi} value={p.dpi + ' DPI'} />
              <S label={t.stBranch} value={r.branchUsed === 'tophat' ? 'top-hat' : 'Otsu'} />
              <S label={t.stCov} value={(r.coverage * 100).toFixed(1) + '%'} />
            </div>
            <button onClick={download} className="mt-4 w-full rounded-lg border border-stone-600 px-4 py-2.5 font-medium text-stone-200 hover:border-amber-500 hover:text-amber-400">{t.stDl}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function S({ label, value }) {
  return (
    <div className="rounded-lg border border-stone-800 px-3 py-2">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-0.5 font-medium text-stone-200 tabular-nums">{value}</div>
    </div>
  );
}
