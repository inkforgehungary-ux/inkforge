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
    setBusy(true); setError(''); setResult(null);
    try {
      const client = await import('../lib/stencil-client');
      const res = await client.runStencil(file, { widthMm: 100, dpi: 300 }, function () {});
      setResult(Object.assign({}, res, { url: client.maskToDataURL(res.mask, res.width, res.height) }));
    } catch (e) {
      setError(e.message || 'Hiba a feldolgozas kozben.');
    }
    setBusy(false);
  }, [file]);

  const download = async function () {
    if (!result) return;
    const client = await import('../lib/stencil-client');
    client.downloadMask(result.mask, result.width, result.height, 'inkforge-stencil.png');
  };

  const r = result && result.report;
  const p = result && result.print;

  return (
    <div className="mt-8 grid gap-8 md:grid-cols-2">
      <div>
        <div onClick={function () { if (inputRef.current) inputRef.current.click(); }}
          className="cursor-pointer rounded-xl border-2 border-dashed border-stone-700 p-8 text-center hover:border-stone-500">
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={function (e) { onPick(e.target.files && e.target.files[0]); }} />
          <p className="text-stone-300">{t('stencil.drop')}</p>
          <p className="mt-1 text-xs text-stone-500">{t('stencil.drop.hint')}</p>
          {file && <p className="mt-2 text-xs text-amber-400">{file.name}</p>}
        </div>

        <button onClick={process} disabled={!file || busy}
          className="mt-6 w-full rounded-lg bg-amber-500 px-4 py-3 font-semibold text-stone-950 hover:bg-amber-400 disabled:bg-stone-700 disabled:text-stone-400">
          {busy ? t('stencil.working') : t('stencil.generate')}
        </button>

        {error && <p className="mt-3 rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
      </div>

      <div className="rounded-xl border border-stone-800 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400">{t('stencil.result')}</h2>
        {!result && !busy && <p className="mt-4 text-sm text-stone-500">{t('stencil.result.empty')}</p>}
        {busy && <p className="mt-4 text-sm text-stone-400">{t('stencil.working')}</p>}
        {result && (
          <div>
            <img src={result.url} alt="" className="mt-4 w-full rounded-lg border border-stone-700 bg-white" />
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Stat label={t('stencil.size')} value={p.widthMm + ' x ' + p.heightMm + ' mm'} />
              <Stat label={t('stencil.resolution')} value={p.dpi + ' DPI'} />
              <Stat label={t('stencil.branchUsed')} value={r.branchUsed === 'tophat' ? 'top-hat' : 'Otsu'} />
              <Stat label={t('stencil.coverage')} value={(r.coverage * 100).toFixed(1) + '%'} />
            </div>
            <button onClick={download}
              className="mt-4 w-full rounded-lg border border-stone-600 px-4 py-2.5 font-medium text-stone-200 hover:border-amber-500 hover:text-amber-400">
              {t('stencil.download')}
            </button>
            <p className="mt-3 text-xs text-stone-500">{t('stencil.printNote')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-stone-800 px-3 py-2">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-0.5 font-medium text-stone-200 tabular-nums">{value}</div>
    </div>
  );
}
