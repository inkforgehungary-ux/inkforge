'use client';

// INKFORGE — STENCIL FELULET (v5)
//
// HIBA JAVITAS (2026-09-27):
//   A feltoltes ag a BONGESZO-motort hasznalta (tonal, 64% folt)
//   a Runpod helyett. Ezert lett a stencil tomeg, nem vonal.
//
//   Most MINDHAROM ut a Runpodra megy:
//     - feltoltes  -> /api/stencil/generate   (Runpod lineart)
//     - leiras     -> /api/stencil/from-text  (FLUX + Runpod lineart)
//     - link       -> /api/stencil/from-url   (Runpod lineart)
//
//   A bongeszo-motor csak VESZTARTALEK, es ki is irja.

import { useState, useCallback, useRef, useMemo } from 'react';
import { runStencil, previewURL } from '../lib/stencil-client';
import { maskToPNGBytes, downloadBlob } from '../lib/png-browser';

const STYLES = [
  { v: 'linework', label: 'Vonalas' },
  { v: 'blackwork', label: 'Blackwork' },
  { v: 'fineline', label: 'Fine line' },
  { v: 'traditional', label: 'Traditional' },
  { v: 'dotwork', label: 'Dotwork' },
  { v: 'ornamental', label: 'Ornamentalis' },
  { v: 'geometric', label: 'Geometrikus' },
  { v: 'tribal', label: 'Tribal' },
  { v: 'japanese', label: 'Japan' },
  { v: 'realism', label: 'Realista kontur' }
];

const BODY_PARTS = [
  { v: '', label: '—' },
  { v: 'forearm', label: 'Alkar' },
  { v: 'upper arm', label: 'Felkar' },
  { v: 'shoulder', label: 'Vall' },
  { v: 'back', label: 'Hat' },
  { v: 'chest', label: 'Mellkas' },
  { v: 'thigh', label: 'Comb' },
  { v: 'calf', label: 'Lab szar' },
  { v: 'ribs', label: 'Borda' },
  { v: 'neck', label: 'Nyak' }
];

const EXAMPLES = [
  'koponya szarnyakkal, alatta szalag, a szalagon PRO PATRIA',
  'farkas fej hegyek elott, kor alaku kompozicio',
  'rozsa tuskevel es ket osszefonodo level',
  'kard es kigyo keresztbe, kelta csomoval',
  'hullam es hold, minimalista vonalak'
];

export default function StencilTool({ lang }) {
  const [tab, setTab] = useState('upload');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [drag, setDrag] = useState(false);
  const [engineMode, setEngineMode] = useState('');
  const inputRef = useRef(null);

  const [widthMm, setWidthMm] = useState(100);
  const [dpi, setDpi] = useState(300);
  const [styleSlug, setStyleSlug] = useState('linework');
  const [bodyPart, setBodyPart] = useState('');
  const [title, setTitle] = useState('');

  const onPick = useCallback(function (f) {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('Csak kepfajl.'); return; }
    setError(''); setInfo(''); setResult(null);
    setFile(f); setPreview(URL.createObjectURL(f));
  }, []);

  const onDrop = useCallback(function (e) {
    e.preventDefault(); setDrag(false);
    onPick(e.dataTransfer.files && e.dataTransfer.files[0]);
  }, [onPick]);

  function startClock() {
    setElapsed(0);
    const t0 = Date.now();
    return setInterval(function () { setElapsed(Math.round((Date.now() - t0) / 1000)); }, 1000);
  }

  async function finishFromGpuPng(base64Png, extra) {
    setStage('converting');
    const bin = atob(base64Png);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'image/png' });
    setPreview(URL.createObjectURL(blob));

    const f = new File([blob], 'runpod-stencil.png', { type: 'image/png' });
    const res = await runStencil(f, {
      widthMm: widthMm, dpi: dpi, branch: 'edge',
      baseStroke: 0, bridgePx: 2, minArea: 20, polish: 0,
      fillHoles: false, registration: true, layers: 1, maxDim: 3000
    });
    setResult(Object.assign({}, res, {
      url: previewURL(res.mask, res.width, res.height, 1100)
    }, extra || {}));
  }

  async function runViaGenerate(f) {
    setStage('analyzing');
    const fd = new FormData();
    fd.append('image', f);
    fd.append('mode', 'lineart');
    fd.append('target_coverage', '0.06');
    fd.append('max_dim', '2000');
    fd.append('bridge_width', '2');
    fd.append('line_weight', '1.5');
    fd.append('width_mm', String(widthMm));
    fd.append('dpi', String(dpi));
    fd.append('title', title || (f.name || 'stencil').replace(/\.[^.]+$/, ''));

    const res = await fetch('/api/stencil/generate', { method: 'POST', body: fd });
    const out = await res.json();

    if (out.cached && out.result) {
      await finishFromGpuPng(out.result.png_base64, { gpu: null, cached: true });
      return;
    }
    if (!out.ok) throw new Error(out.error || 'Hiba');

    setStage('gpu');
    const jobId = out.jobId;
    let done = null;
    for (let i = 0; i < 150; i++) {
      await new Promise(function (r) { setTimeout(r, 2000); });
      const s = await fetch('/api/stencil/generate?id=' + encodeURIComponent(jobId) + '&what=result');
      const sj = await s.json();
      if (sj.ok && sj.ready) { done = sj.result; break; }
      const st = await fetch('/api/stencil/generate?id=' + encodeURIComponent(jobId));
      const stj = await st.json();
      if (stj.status && stj.status.status === 'error') throw new Error(stj.status.error || 'Hiba');
    }
    if (!done) throw new Error('Az elso futasnal a modell betoltese 2-4 perc. Probald ujra.');

    await finishFromGpuPng(done.png_base64, {
      gpu: { ms: done.gpuMs, engine: done.engine },
      gpuCoverage: done.coverage
    });
  }

  const process = useCallback(async function () {
    setBusy(true); setError(''); setInfo(''); setResult(null);
    const iv = startClock();
    try {
      const hp = await fetch('/api/stencil/health');
      const h = await hp.json();
      setEngineMode(h.mode || 'browser');
      const gpuOn = h.mode === 'runpod';

      if (tab === 'text') {
        if (description.trim().length < 4) throw new Error('Irj le, mit abrazoljon.');
        setStage('generating');
        const res = await fetch('/api/stencil/from-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: description.trim(),
            style_slug: styleSlug,
            body_part: bodyPart || null,
            width_mm: widthMm, dpi: dpi,
            title: title || description.trim().slice(0, 60)
          })
        });
        const out = await res.json();
        if (!out.ok) throw new Error(out.error || 'Hiba');
        if (out.embeddedText) setInfo('Felismerve: ' + out.embeddedText);

        const jobId = out.jobId;
        let done = null;
        for (let i = 0; i < 150; i++) {
          await new Promise(function (r) { setTimeout(r, 2000); });
          const s = await fetch('/api/stencil/from-text?id=' + encodeURIComponent(jobId) + '&what=result');
          const sj = await s.json();
          if (sj.ok && sj.ready) { done = sj.result; break; }
          const st = await fetch('/api/stencil/from-text?id=' + encodeURIComponent(jobId));
          const stj = await st.json();
          if (stj.status && stj.status.status === 'error') throw new Error(stj.status.error || 'Hiba');
        }
        if (!done) throw new Error('Az elso futasnal a modell betoltese 2-4 perc. Probald ujra.');

        await finishFromGpuPng(done.png_base64, {
          prompt: done.prompt, gpu: { ms: done.gpuMs, engine: done.engine }
        });

      } else if (tab === 'url') {
        if (!/^https?:\/\//.test(imageUrl.trim())) throw new Error('Add meg a kep linkjet.');
        setStage('analyzing');
        const res = await fetch('/api/stencil/from-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: imageUrl.trim(), width_mm: widthMm, dpi: dpi,
            target_coverage: 0.06, title: title || 'link-minta'
          })
        });
        const out = await res.json();
        if (!out.ok) throw new Error(out.error || 'Hiba');

        const jobId = out.jobId;
        let done = null;
        for (let i = 0; i < 150; i++) {
          await new Promise(function (r) { setTimeout(r, 2000); });
          const s = await fetch('/api/stencil/from-url?id=' + encodeURIComponent(jobId) + '&what=result');
          const sj = await s.json();
          if (sj.ok && sj.ready) { done = sj.result; break; }
          const st = await fetch('/api/stencil/from-url?id=' + encodeURIComponent(jobId));
          const stj = await st.json();
          if (stj.status && stj.status.status === 'error') throw new Error(stj.status.error || 'Hiba');
        }
        if (!done) throw new Error('Az elso futasnal a modell betoltese 2-4 perc. Probald ujra.');

        await finishFromGpuPng(done.png_base64, { gpu: { ms: done.gpuMs } });

      } else {
        if (!file) { setBusy(false); clearInterval(iv); return; }
        if (gpuOn) {
          await runViaGenerate(file);
        } else {
          setInfo('A GPU motor nem elerheto — a bongeszo-motor fut (tonal ag, tomeges).');
          setStage('analyzing');
          const res = await runStencil(file, {
            widthMm: widthMm, dpi: dpi, branch: 'auto',
            baseStroke: 1, bridgePx: 2, minArea: 20, polish: 1,
            fillHoles: false, registration: true, layers: 1
          }, function (s) { setStage(s); });
          setResult(Object.assign({}, res, { url: previewURL(res.mask, res.width, res.height, 1100) }));
        }
      }
    } catch (e) {
      setError(e && e.message ? e.message : 'Hiba');
    } finally {
      clearInterval(iv);
      setBusy(false); setStage('');
    }
  }, [tab, file, description, imageUrl, widthMm, dpi, styleSlug, bodyPart, title]);

  const r = result && result.report;
  const p = result && result.print;
  const stageLabel = useMemo(function () {
    if (stage === 'generating') return 'Minta generalasa...';
    if (stage === 'converting') return 'Stencil keszitese...';
    if (stage === 'gpu') return 'A GPU dolgozik...';
    if (stage === 'decode' || stage === 'measure' || stage === 'analyzing') return 'Kep elemzese...';
    return 'Feldolgozas...';
  }, [stage]);
  const qualityTone = r ? (r.quality === 'hasznalhato' ? 'ok' : (r.quality === 'hidakkal javithato' ? 'warn' : 'bad')) : '';

  return (
    <div className="mt-8">
      <div className="flex flex-wrap gap-2">
        {[['upload', 'Kep feltoltese'], ['text', 'Leirasbol'], ['url', 'Linkbol']].map(function (x) {
          const on = tab === x[0];
          return (
            <button key={x[0]} onClick={function () { setTab(x[0]); setResult(null); setError(''); setInfo(''); }}
              className={'rounded-lg border px-4 py-2 text-sm transition ' +
                (on ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-stone-800 text-stone-400 hover:border-stone-600')}>
              {x[1]}
            </button>
          );
        })}
        {engineMode && (
          <span className={'ms-auto self-center rounded-lg border px-3 py-1 text-[10px] uppercase tracking-wider ' +
            (engineMode === 'runpod' ? 'border-emerald-900/60 text-emerald-400' : 'border-amber-900/60 text-amber-400')}>
            {engineMode === 'runpod' ? 'GPU motor' : 'CPU motor'}
          </span>
        )}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          {tab === 'upload' && (
            <div onDragOver={function (e) { e.preventDefault(); setDrag(true); }}
              onDragLeave={function () { setDrag(false); }}
              onDrop={onDrop} onClick={function () { if (inputRef.current) inputRef.current.click(); }}
              className={'card3d cursor-pointer p-8 text-center transition ' + (drag ? 'border-amber-500' : '')}>
              <input ref={inputRef} type="file" accept="image/*" className="hidden"
                onChange={function (e) { onPick(e.target.files && e.target.files[0]); }} />
              {preview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={preview} alt="" className="mx-auto max-h-72 rounded-lg border border-stone-700" />
              ) : (
                <div>
                  <div className="mx-auto mb-4 flex h-14 w-14 rotate-45 items-center justify-center border border-amber-700/60">
                    <span className="-rotate-45 text-2xl text-amber-500">+</span>
                  </div>
                  <p className="text-stone-200">Huzd ide a kepet, vagy kattints</p>
                  <p className="mt-2 text-xs text-stone-500">PNG, JPG — a GPU motor vonalas stencilt keszit belole</p>
                </div>
              )}
            </div>
          )}

          {tab === 'text' && (
            <div className="card3d p-6">
              <label className="block">
                <span className="text-sm text-stone-300">Mit abrazoljon?</span>
                <textarea value={description} onChange={function (e) { setDescription(e.target.value); }}
                  rows={4} placeholder={EXAMPLES[0]}
                  className="mt-2 w-full rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-sm text-stone-200 outline-none focus:border-amber-600" />
                <span className="mt-1 block text-xs text-stone-500">Irj le par szoval. A stencil-stilust es a hatter kizarasat a motor adja hozza.</span>
              </label>
              <div className="mt-4">
                <span className="text-xs uppercase tracking-wider text-stone-500">Peldak</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {EXAMPLES.map(function (ex) {
                    return (
                      <button key={ex} onClick={function () { setDescription(ex); }}
                        className="rounded-lg border border-stone-800 px-2.5 py-1 text-xs text-stone-400 hover:border-amber-600 hover:text-amber-300">
                        {ex.length > 42 ? ex.slice(0, 42) + '...' : ex}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'url' && (
            <div className="card3d p-6">
              <label className="block">
                <span className="text-sm text-stone-300">Kep linkje</span>
                <input type="url" value={imageUrl} onChange={function (e) { setImageUrl(e.target.value); }}
                  placeholder="https://..."
                  className="mt-2 w-full rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-sm text-stone-200 outline-none focus:border-amber-600" />
                <span className="mt-1 block text-xs text-stone-500">Teljes cim, pl. https://.../minta.png</span>
              </label>
            </div>
          )}

          <div className="card3d mt-5 p-6">
            <div className="space-y-4">
              {tab === 'text' && (
                <div>
                  <span className="text-sm text-stone-300">Stilus</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {STYLES.map(function (s) {
                      return (
                        <button key={s.v} onClick={function () { setStyleSlug(s.v); }}
                          className={'rounded-lg border px-3 py-1.5 text-xs transition ' +
                            (styleSlug === s.v ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-stone-800 text-stone-400 hover:border-stone-600')}>
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs uppercase tracking-wider text-stone-500">Testtaj</span>
                  <select value={bodyPart} onChange={function (e) { setBodyPart(e.target.value); }}
                    className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-sm text-stone-200">
                    {BODY_PARTS.map(function (b) { return <option key={b.v} value={b.v}>{b.label}</option>; })}
                  </select>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider text-stone-500">Felbontas</span>
                  <select value={dpi} onChange={function (e) { setDpi(+e.target.value); }}
                    className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-sm text-stone-200">
                    <option value={150}>150 DPI</option>
                    <option value={300}>300 DPI</option>
                    <option value={600}>600 DPI</option>
                  </select>
                </div>
              </div>

              <Slider label="Szelesseg" value={widthMm} unit="mm" min={20} max={400} step={5} onChange={setWidthMm} />

              <div>
                <span className="text-xs uppercase tracking-wider text-stone-500">Minta neve</span>
                <input type="text" value={title} onChange={function (e) { setTitle(e.target.value); }}
                  placeholder="pl. koponya-propatria"
                  className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-sm text-stone-200 outline-none focus:border-amber-600" />
              </div>
            </div>

            <button onClick={process} disabled={busy || (tab === 'upload' && !file)}
              className={'btn3d mt-6 w-full !py-4 ' + (busy || (tab === 'upload' && !file) ? 'cursor-not-allowed opacity-40' : '')}>
              {busy ? stageLabel : 'Stencil keszitese'}
            </button>

            {busy && elapsed > 0 && (
              <p className="mt-3 text-center text-xs text-stone-500">
                {elapsed} mp · az elso futasnal a modell betoltese 2-4 perc
              </p>
            )}

            {error && <p className="mt-3 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">Hiba: {error}</p>}
            {info && <p className="mt-3 rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-xs text-stone-400">{info}</p>}
          </div>
        </div>

        <div className="card3d p-6">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">Eredmeny</h2>

          {!result && !busy && <p className="mt-6 text-sm text-stone-500">A kesz stencil itt jelenik meg.</p>}

          {busy && (
            <div className="mt-12 flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-stone-800 border-t-amber-500" />
              <p className="text-sm text-stone-400">{stageLabel}</p>
              {elapsed > 0 && <p className="text-xs text-stone-600">{elapsed} mp</p>}
            </div>
          )}

          {result && (
            <div>
              <div className="knot-rule my-5" />
              <div className="rounded-xl border border-stone-700 bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result.url} alt="" className="mx-auto block max-h-[420px] w-auto" />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label="Mert meret" value={p.widthMm + ' x ' + p.heightMm + ' mm'} gold />
                <Stat label="Raszter" value={p.px} />
                <Stat label="px / mm" value={String(p.pxPerMm)} />
                <Stat label="Fedettseg" value={r.coverage + '%'} />
                <Stat label="Hidak" value={String(r.bridges)} />
                <Stat label="Kulon darab" value={String(r.islands)} tone={r.islands > 1 ? 'warn' : 'ok'} />
              </div>

              <div className={'mt-4 rounded-lg border px-4 py-3 text-sm ' + (qualityTone === 'ok' ? 'border-emerald-900/60 bg-emerald-950/30 text-emerald-300' : qualityTone === 'warn' ? 'border-amber-900/60 bg-amber-950/30 text-amber-300' : 'border-red-900/60 bg-red-950/30 text-red-300')}>
                <div className="font-semibold">Minoseg: {r.quality}</div>
                <div className="mt-1 text-xs opacity-90">{r.verdictText || ''}</div>
              </div>

              {result.gpu && (
                <p className="mt-3 text-xs text-stone-500">
                  GPU: {result.gpu.engine || '-'} · {result.gpu.ms} ms{result.cached ? ' · cache-talalat (0 GPU-ido)' : ''}
                </p>
              )}
              {result.gpuCoverage != null && (
                <p className="mt-1 text-xs text-stone-500">GPU fedettseg: {result.gpuCoverage}%</p>
              )}

              {result.prompt && (
                <details className="mt-4 rounded-lg border border-stone-800 bg-stone-950/50 px-4 py-3">
                  <summary className="cursor-pointer text-xs text-stone-400">A generalt prompt</summary>
                  <p className="mt-2 text-xs leading-relaxed text-stone-500">{result.prompt}</p>
                </details>
              )}

              <button
                onClick={async function () {
                  const png = await maskToPNGBytes(result.mask, result.width, result.height, { transparent: true });
                  downloadBlob(png, 'inkforge-' + (title || 'stencil') + '-' + p.widthMm + 'mm.png', 'image/png');
                }}
                className="btn3d mt-5 w-full !py-3.5">PNG letoltese (atlatszo)</button>

              <p className="mt-3 text-xs leading-relaxed text-stone-500">Nyomtatas 100%-os meretben — kapcsold ki a Fit to page opciot.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, unit, min, max, step, onChange }) {
  return (
    <label className="block">
      <span className="flex justify-between text-sm text-stone-300">
        <span>{label}</span>
        <span className="tabular-nums text-amber-500">{value}{unit ? ' ' + unit : ''}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={function (e) { onChange(+e.target.value); }} className="mt-2 w-full" />
    </label>
  );
}

function Stat({ label, value, tone, gold }) {
  const color = tone === 'ok' ? 'text-emerald-400' : tone === 'warn' ? 'text-amber-400' : tone === 'bad' ? 'text-red-400' : gold ? 'gold-text' : 'text-stone-200';
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-950/50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-stone-500">{label}</div>
      <div className={'mt-1 text-sm font-semibold tabular-nums ' + color}>{value}</div>
    </div>
  );
}
