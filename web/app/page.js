'use client';

import { useState, useCallback, useRef } from 'react';
import { runStencil, maskToDataURL, downloadMask } from '../lib/stencil-client';

export default function Home() {
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
    if (!f || !f.type.startsWith('image/')) { setError('Csak kepfajl toltheto fel.'); return; }
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
      setError(e.message || 'Hiba a feldolgozas kozben.');
    } finally {
      setBusy(false);
      setStage('');
    }
  }, [file, widthMm, dpi, forceBranch, lineWeight, bridgeWidth]);

  const r = result?.report;
  const p = result?.print;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/inkforge-logo.png" alt="InkForge" className="h-14 w-auto" />
        <p className="mt-3 text-sm text-stone-400">
          Az otletedbol tiszta sablon. Feltoltod a kepet, a bongeszodben lefut a feldolgozas — a kep nem hagyja el a gepedet.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
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
              <img src={preview} alt="Feltoltott kep" className="mx-auto max-h-64 rounded-lg" />
            ) : (
              <>
                <p className="text-stone-300">Huzd ide a kepet, vagy kattints</p>
                <p className="mt-1 text-xs text-stone-500">PNG, JPG — fekete-feher rajz adja a legjobb eredmenyt</p>
              </>
            )}
          </div>

          <div className="mt-6 space-y-4 rounded-xl border border-stone-800 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400">Beallitasok</h2>

            <label className="block">
              <span className="flex justify-between text-sm text-stone-300">
                <span>Szelesseg</span><span className="tabular-nums text-stone-400">{widthMm} mm</span>
              </span>
              <input type="range" min={30} max={300} step={5} value={widthMm}
                onChange={(e) => setWidthMm(+e.target.value)} className="mt-2 w-full accent-amber-500" />
            </label>

            <label className="block">
              <span className="flex justify-between text-sm text-stone-300">
                <span>Vonalsuly</span><span className="tabular-nums text-stone-400">{lineWeight.toFixed(2)}</span>
              </span>
              <input type="range" min={0.5} max={4} step={0.1} value={lineWeight}
                onChange={(e) => setLineWeight(+e.target.value)} className="mt-2 w-full accent-amber-500" />
            </label>

            <label className="block">
              <span className="flex justify-between text-sm text-stone-300">
                <span>Hid vastagsag</span><span className="tabular-nums text-stone-400">{bridgeWidth.toFixed(2)}</span>
              </span>
              <input type="range" min={0.4} max={3} step={0.1} value={bridgeWidth}
                onChange={(e) => setBridgeWidth(+e.target.value)} className="mt-2 w-full accent-amber-500" />
            </label>

            <label className="block">
              <span className="text-sm text-stone-300">Ag</span>
              <select value={forceBranch} onChange={(e) => setForceBranch(e.target.value)}
                className="mt-2 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200">
                <option value="auto">Automatikus (ajanlott)</option>
                <option value="tophat">top-hat — fotos / sotet kep</option>
                <option value="otsu">Otsu — tiszta vonalrajz</option>
              </select>
              <span className="mt-1 block text-xs text-stone-500">
                Az automatikus meres a kep fenyeseseget es elsuruseget nezi, es maga dont.
              </span>
            </label>

            <label className="block">
              <span className="text-sm text-stone-300">Nyomtatasi felbontas</span>
              <select value={dpi} onChange={(e) => setDpi(+e.target.value)}
                className="mt-2 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200">
                <option value={300}>300 DPI (ajanlott)</option>
                <option value={600}>600 DPI</option>
                <option value={150}>150 DPI (vazlat)</option>
              </select>
            </label>

            <button onClick={process} disabled={!file || busy}
              className="w-full rounded-lg bg-amber-500 px-4 py-3 font-semibold text-stone-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400">
              {busy ? (stage === 'meres' ? 'Kep elemzese...' : 'Sablon keszitese...') : 'Sablon generalasa'}
            </button>

            {error && <p className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
          </div>
        </section>

        <section>
          <div className="rounded-xl border border-stone-800 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400">Eredmeny</h2>

            {!result && !busy && (
              <p className="mt-4 text-sm text-stone-500">
                A kesz sablon itt jelenik meg. Mellette a meret mm-ben es a motor meresei.
              </p>
            )}

            {busy && (
              <div className="mt-8 flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-700 border-t-amber-500" />
                <p className="text-sm text-stone-400">{stage === 'meres' ? 'Kep elemzese...' : 'Sablon keszitese...'}</p>
              </div>
            )}

            {result && (
              <>
                <img src={result.url} alt="Kesz stencil"
                  className="mt-4 w-full rounded-lg border border-stone-700 bg-white" />

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Stat label="Meret" value={`${p.widthMm} x ${p.heightMm} mm`} />
                  <Stat label="Felbontas" value={`${p.dpi} DPI`} />
                  <Stat label="Raszter" value={p.px} />
                  <Stat label="px / mm" value={String(p.pxPerMm)} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <Stat label="Motor ag" value={r.branchUsed === 'tophat' ? 'top-hat' : 'Otsu'} />
                  <Stat label="Fedettseg" value={`${(r.coverage * 100).toFixed(1)}%`} />
                  <Stat label="Minosites" value={r.quality} tone={r.quality === 'hasznalhato' ? 'ok' : 'warn'} />
                  <Stat label="Hidak" value={String(r.bridges)} />
                </div>

                {r.quality !== 'hasznalhato' && (
                  <p className="mt-3 rounded-lg border border-amber-700/60 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
                    {r.quality === 'tul fedett'
                      ? 'A sablon tul sotet lett — a kep fotos. Probald a top-hat agat, vagy tolts fel tiszta vonalrajzot.'
                      : 'A sablon tul ritka — probald vastagabb vonalsullyal, vagy masik aggal.'}
                  </p>
                )}

                <button
                  onClick={() => downloadMask(result.mask, result.width, result.height,
                    `inkforge-stencil-${p.widthMm}mm-${p.dpi}dpi.png`)}
                  className="mt-4 w-full rounded-lg border border-stone-600 px-4 py-2.5 font-medium text-stone-200 transition hover:border-amber-500 hover:text-amber-400">
                  Letoltes (PNG, pontmeret)
                </button>

                <p className="mt-3 text-xs leading-relaxed text-stone-500">
                  Nyomtatas elott kapcsold ki a Fit to page opciot, es ellenorizd, hogy a papiron a megadott szelesseg {p.widthMm} mm.
                </p>
              </>
            )}
          </div>
        </section>
      </div>

      <footer className="mt-14 border-t border-stone-800 pt-6 text-xs text-stone-600">
        InkForge · a feldolgozas a bongeszodben fut, a kep nem kerul szerverre.
      </footer>
    </main>
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
