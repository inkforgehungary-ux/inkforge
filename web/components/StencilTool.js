'use client';

import { useState, useCallback, useRef } from 'react';
import { runStencil, maskToDataURL, downloadMask } from '../lib/stencil-client';

export default function StencilTool({ t }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  const [widthMm, setWidthMm] = useState(100);
  const [dpi, setDpi] = useState(300);
  const [forceBranch, setForceBranch] = useState('auto');
  const [lineWeight, setLineWeight] = useState(1.5);
  const [bridgeWidth, setBridgeWidth] = useState(1.2);

  const onPick = useCallback((f) => {
    if (!f || !f.type.startsWith('image/')) { setError('Only image files.'); return; }
    setError('');
    setResult(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDrag(false);
    onPick(e.dataTransfer.files?.[0]);
  }, [onPick]);

  const process = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const opts = {
        widthMm, dpi, lineWeight, bridgeWidth,
        ...(forceBranch !== 'auto' ? { forceBranch } : {}),
      };
      const res = await runStencil(file, opts, (s) => setStage(s));
      setResult({ ...res, url: maskToDataURL(res.mask, res.width, res.height) });
    } catch (e) {
      setError(e.message || 'Processing error.');
    } finally {
      setBusy(false);
      setStage('');
    }
  }, [file, widthMm, dpi, forceBranch, lineWeight, bridgeWidth]);

  const r = result?.report;
  const p = result?.print;

  return (
    <div className="mt-8 grid gap-8 md:grid-cols-2">
      <div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
            drag ? 'border-amber-500 bg-amber-500/5' : 'border-stone-700 hover:border-stone-500'
          }`}
        >
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])} />
          {preview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={preview} alt="" className="mx-auto max-h-64 rounded-lg" />
          ) : (
            <>
              <p className="text-stone-300">{t('stencil.drop')}</p>
              <p className="mt-1 text-xs text-stone-500">{t('stencil.drop.hint')}</p>
            </>
          )}
        </div>

        <div className="mt-6 space-y-4 rounded-xl border border-stone-800 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400">
            {t('stencil.settings')}
          </h2>

          <label className="block">
            <span className="flex justify-between text-sm text-stone-300">
              <span>{t('stencil.width')}</span>
              <span className="tabular-nums text-stone-400">{widthMm} mm</span>
            </span>
            <input type="range" min={30} max={300} step={5} value={widthMm}
              onChange={(e) => setWidthMm(+e.target.value)} className="mt-2 w-full accent-amber-500" />
          </label>

          <label className="block">
            <span className="flex justify-between text-sm text-stone-300">
              <span>{t('stencil.lineWeight')}</span>
              <span className="tabular-nums text-stone-400">{lineWeight.toFixed(2)}</span>
            </span>
            <input type="range" min={0.5} max={4} step={0.1} value={lineWeight}
              onChange={(e) => setLineWeight(+e.target.value)} className="mt-2 w-full accent-amber-500" />
          </label>

          <label className="block">
            <span className="flex justify-between text-sm text-stone-300">
              <span>{t('stencil.bridge')}</span>
              <span className="tabular-nums text-stone-400">{bridgeWidth.toFixed(2)}</span>
            </span>
            <input type="range" min={0.4} max={3} step={0.1} value={bridgeWidth}
              onChange={(e) => setBridgeWidth(+e.target.value)} className="mt-2 w-full accent-amber-500" />
          </label>

          <label className="block">
            <span className="text-sm text-stone-300">{t('stencil.branch')}</span>
            <select value={forceBranch} onChange={(e) => setForceBranch(e.target.value)}
              className="mt-2 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200">
              <option value="auto">{t('stencil.branch.auto')}</option>
              <option value="tophat">{t('stencil.branch.tophat')}</option>
              <option value="otsu">{t('stencil.branch.otsu')}</option>
            </select>
            <span className="mt-1 block text-xs text-stone-500">{t('stencil.branch.hint')}</span>
          </label>

          <label className="block">
            <span className="text-sm text-stone-300">{t('stencil.dpi')}</span>
            <select value={dpi} onChange={(e) => setDpi(+e.target.value)}
              className="mt-2 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200">
              <option value={300}>300 DPI</option>
              <option value={600}>600 DPI</option>
              <option value={150}>150 DPI</option>
            </select>
          </label>

          <button onClick={process} disabled={!file || busy}
            className="w-full rounded-lg bg-amber-500 px-4 py-3 font-semibold text-stone-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400">
            {busy
              ? (stage === 'meres' ? t('stencil.analyzing') : t('stencil.working'))
              : t('stencil.generate')}
          </button>

          {error && <p className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
        </div>
      </div>

      <div>
        <div className="rounded-xl border border-stone-800 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400">
            {t('stencil.result')}
          </h2>

          {!result && !busy && (
            <p className="mt-4 text-sm text-stone-500">{t('stencil.result.empty')}</p>
          )}

          {busy && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-700 border-t-amber-500" />
              <p className="text-sm text-stone-400">
                {stage === 'meres' ? t('stencil.analyzing') : t('stencil.working')}
              </p>
            </div>
          )}

          {result && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.url} alt="" className="mt-4 w-full rounded-lg border border-stone-700 bg-white" />

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Stat label={t('stencil.size')} value={`${p.widthMm} × ${p.heightMm} mm`} />
                <Stat label={t('stencil.resolution')} value={`${p.dpi} DPI`} />
                <Stat label={t('stencil.raster')} value={p.px} />
                <Stat label={t('stencil.pxmm')} value={String(p.pxPerMm)} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <Stat label={t('stencil.branchUsed')} value={r.branchUsed === 'tophat' ? 'top-hat' : 'Otsu'} />
                <Stat label={t('stencil.coverage')} value={`${(r.coverage * 100).toFixed(1)}%`} />
                <Stat label={t('stencil.quality')} value={r.quality}
                  tone={r.quality === 'hasznalhato' ? 'ok' : 'warn'} />
                <Stat label={t('stencil.bridges')} value={String(r.bridges)} />
              </div>

              <button
                onClick={() => downloadMask(result.mask, result.width, result.height,
                  `inkforge-stencil-${p.widthMm}mm-${p.dpi}dpi.png`)}
                className="mt-4 w-full rounded-lg border border-stone-600 px-4 py-2.5 font-medium text-stone-200 transition hover:border-amber-500 hover:text-amber-400">
                {t('stencil.download')}
              </button>

              <p className="mt-3 text-xs leading-relaxed text-stone-500">{t('stencil.printNote')}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const color = tone === 'ok' ? 'text-emerald-400' : tone === 'warn' ? 'text-amber-400' : 'text-stone-200';
  return (
    <div className="rounded-lg border border-stone-800 px-3 py-2">
      <div className="text-xs text-stone-500">{label}</div>
      <div className={`mt-0.5 font-medium tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
