'use client';

import { useState, useRef, useCallback } from 'react';

const MAX_FILE_BYTES = 20 * 1024 * 1024;

export default function StencilTool({ t }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [widthMm, setWidthMm] = useState(100);
  const [dpi, setDpi] = useState(300);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const onPick = useCallback(function (f) {
    if (!f) return;
    if (!f.type || !f.type.startsWith('image/')) {
      setError(t('stencil.error.image'));
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setError(t('stencil.error.fileTooLarge'));
      return;
    }
    setFile(f);
    setError('');
    setResult(null);
  }, [t]);

  const process = useCallback(async function () {
    if (!file || busy) return;
    if (!Number.isFinite(widthMm) || widthMm < 20 || widthMm > 500) {
      setError(t('stencil.error.width'));
      return;
    }
    if (!Number.isFinite(dpi) || dpi < 150 || dpi > 600) {
      setError(t('stencil.error.dpi'));
      return;
    }

    setBusy(true);
    setError('');
    try {
      const m = await import('../lib/stencil-client');
      const res = await m.runStencil(file, { widthMm, dpi });
      setResult({
        mask: res.mask,
        width: res.width,
        height: res.height,
        report: res.report,
        print: res.print,
        url: m.maskToDataURL(res.mask, res.width, res.height),
      });
    } catch (e) {
      setError(e && e.message ? e.message : t('stencil.error.process'));
    } finally {
      setBusy(false);
    }
  }, [busy, dpi, file, t, widthMm]);

  const download = async function () {
    if (!result) return;
    const m = await import('../lib/stencil-client');
    m.downloadMask(result.mask, result.width, result.height, 'inkforge-stencil.png');
  };

  const handleDrop = function (event) {
    event.preventDefault();
    setDragging(false);
    onPick(event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]);
  };

  const r = result && result.report;
  const p = result && result.print;

  return (
    <div className="mt-8 grid gap-8 md:grid-cols-2">
      <div>
        <div
          role="button"
          tabIndex={0}
          onClick={function () { if (inputRef.current) inputRef.current.click(); }}
          onKeyDown={function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (inputRef.current) inputRef.current.click();
            }
          }}
          onDragOver={function (e) { e.preventDefault(); setDragging(true); }}
          onDragLeave={function () { setDragging(false); }}
          onDrop={handleDrop}
          className={'cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ' + (dragging ? 'border-amber-400 bg-amber-950/20' : 'border-stone-700 hover:border-stone-500')}
          aria-label={t('stencil.drop')}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={function (e) {
              onPick(e.target.files && e.target.files[0]);
              e.target.value = '';
            }}
          />
          <p className="text-stone-300">{t('stencil.drop')}</p>
          <p className="mt-1 text-xs text-stone-500">{t('stencil.drop.hint')}</p>
          {file && <p className="mt-2 break-all text-xs text-amber-400">{file.name}</p>}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="rounded-lg border border-stone-800 bg-stone-900/40 p-3">
            <span className="block text-xs text-stone-500">{t('stencil.size')}</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min="20"
                max="500"
                step="1"
                value={widthMm}
                onChange={function (e) { setWidthMm(Number(e.target.value)); }}
                className="w-full rounded-md border border-stone-700 bg-stone-950 px-2 py-1.5 text-sm text-stone-100 outline-none focus:border-amber-500"
              />
              <span className="text-xs text-stone-500">mm</span>
            </div>
          </label>

          <label className="rounded-lg border border-stone-800 bg-stone-900/40 p-3">
            <span className="block text-xs text-stone-500">{t('stencil.resolution')}</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min="150"
                max="600"
                step="50"
                value={dpi}
                onChange={function (e) { setDpi(Number(e.target.value)); }}
                className="w-full rounded-md border border-stone-700 bg-stone-950 px-2 py-1.5 text-sm text-stone-100 outline-none focus:border-amber-500"
              />
              <span className="text-xs text-stone-500">DPI</span>
            </div>
          </label>
        </div>

        <button
          onClick={process}
          disabled={!file || busy}
          className="mt-6 w-full rounded-lg bg-amber-500 px-4 py-3 font-semibold text-stone-950 hover:bg-amber-400 disabled:bg-stone-700 disabled:text-stone-400"
        >
          {busy ? t('stencil.working') : t('stencil.generate')}
        </button>

        {error && <p className="mt-3 rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300" role="alert">{error}</p>}
      </div>

      <div className="rounded-xl border border-stone-800 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400">{t('stencil.result')}</h2>
        {!result && !busy && <p className="mt-4 text-sm text-stone-500">{t('stencil.result.empty')}</p>}
        {busy && <p className="mt-4 text-sm text-stone-400">{t('stencil.working')}</p>}
        {result && (
          <div>
            <img src={result.url} alt={t('stencil.result.alt')} className="mt-4 w-full rounded-lg border border-stone-700 bg-white" />
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <S label={t('stencil.size')} value={p.widthMm + ' x ' + p.heightMm + ' mm'} />
              <S label={t('stencil.resolution')} value={p.dpi + ' DPI'} />
              <S label={t('stencil.branchUsed')} value={r.branchUsed === 'tophat' ? 'black-hat' : 'Otsu'} />
              <S label={t('stencil.coverage')} value={(r.coverage * 100).toFixed(1) + '%'} />
            </div>
            <button onClick={download} className="mt-4 w-full rounded-lg border border-stone-600 px-4 py-2.5 font-medium text-stone-200 hover:border-amber-500 hover:text-amber-400">
              {t('stencil.download')}
            </button>
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
