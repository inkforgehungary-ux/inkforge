// ============================================================
// INKFORGE — STENCIL FELULET (v4)
// Harom bemeneti ut egy feluleten:
//   1) Kep feltoltese
//   2) Leirasbol (szoveg -> AI kep -> stencil)
//   3) Linkbol
//
// A Runpod ComfyUI vegpontot hivja (/runsync), a valaszt
// base64 PNG-kent kapja, majd a helyi motor adja a mm-pontos meretet.
// ============================================================

'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { runStencil, previewURL } from '../lib/stencil-client';
import { maskToPNGBytes, bytesToBase64, downloadBlob } from '../lib/png-browser';

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

const T = {
  hu: {
    tUpload: 'Kep feltoltese', tText: 'Leirasbol', tUrl: 'Linkbol',
    drop: 'Huzd ide a kepet, vagy kattints', hint: 'PNG, JPG — fekete-feher rajz adja a legjobb eredmenyt',
    descL: 'Mit abrazoljon?', descHint: 'Irj le par szoval, mit szeretnel. A stencil-stilust a motor adja hozza.',
    urlL: 'Kep linkje', urlHint: 'Teljes cim, pl. https://.../minta.png',
    styleL: 'Stilus', bodyL: 'Testtaj', widthL: 'Szelesseg', dpiL: 'Felbontas',
    go: 'Stencil keszitese', work: 'Feldolgozas...', analyzing: 'Kep elemzese...', generating: 'Minta generalasa...', converting: 'Stencil keszitese...',
    res: 'Eredmeny', empty: 'A kesz stencil itt jelenik meg.',
    size: 'Mert meret', raster: 'Raszter', pxmm: 'px / mm', branchUsed: 'Motor',
    cov: 'Fedettseg', quality: 'Minoseg', br: 'Hidak', islands: 'Kulon darab',
    dl: 'PNG letoltese (atlatszo)', newImg: 'Uj minta',
    prompt: 'A generalt prompt', source: 'Forras',
    err: 'Hiba', errFile: 'Csak kepfajl.', errUrl: 'Add meg a kep linkjet.', errDesc: 'Irj le, mit abrazoljon.',
    examples: 'Peldak',
    printNote: 'Nyomtatas 100%-os meretben — kapcsold ki a Fit to page opciot.'
  }
};

export default function StencilTool({ lang }) {
  const t = T[lang] || T.hu;
  const [tab, setTab] = useState('upload');

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');

  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  const [widthMm, setWidthMm] = useState(100);
  const [dpi, setDpi] = useState(300);
  const [styleSlug, setStyleSlug] = useState('linework');
  const [bodyPart, setBodyPart] = useState('');
  const [title, setTitle] = useState('');

  const onPick = useCallback(function (f) {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError(t.errFile); return; }
    setError(''); setResult(null);
    setFile(f); setPreview(URL.createObjectURL(f));
  }, [t.errFile]);

  const onDrop = useCallback(function (e) {
    e.preventDefault(); setDrag(false);
    onPick(e.dataTransfer.files && e.dataTransfer.files[0]);
  }, [onPick]);

  // A közös futtato: a harom ut egy helyre fut be
  const runFromBlob = useCallback(async function (blob, name) {
    const f = new File([blob], name || 'minta.png', { type: blob.type || 'image/png' });
    const res = await runStencil(f, {
      widthMm: widthMm, dpi: dpi, branch: 'auto',
      baseStroke: 1, bridgePx: 2, minArea: 20, polish: 1,
      fillHoles: false, registration: true, layers: 1
    }, function (s) { setStage(s); });
    return res;
  }, [widthMm, dpi]);

  const process = useCallback(async function () {
    setBusy(true); setError(''); setInfo(''); setResult(null);
    try {
      if (tab === 'text') {
        if (description.trim().length < 4) { setError(t.errDesc); setBusy(false); return; }
        setStage('generating');
        await new Promise(function (r) { setTimeout(r, 0); });

        const res = await fetch('/api/stencil/from-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: description.trim(),
            style_slug: styleSlug,
            body_part: bodyPart || null,
            width_mm: widthMm,
            dpi: dpi,
            title: title || description.trim().slice(0, 60)
          })
        });
        const out = await res.json();
        if (!out.ok) { setError(out.error || t.err); setBusy(false); return; }

        if (out.prompt) setInfo(t.prompt + ': ' + out.prompt.slice(0, 140) + '...');
        if (out.embeddedText) setInfo(t.prompt + ': „' + out.embeddedText + '" felismerve');

        setStage('converting');
        const jobId = out.jobId;
        let done = null;
        for (let i = 0; i < 60; i++) {
          await new Promise(function (r) { setTimeout(r, 2000); });
          const s = await fetch('/api/stencil/from-text?id=' + encodeURIComponent(jobId) + '&what=result');
          const sj = await s.json();
          if (sj.ok && sj.ready) { done = sj.result; break; }
          const st = await fetch('/api/stencil/from-text?id=' + encodeURIComponent(jobId));
          const stj = await st.json();
          if (stj.status && stj.status.status === 'error') { setError(stj.status.error || t.err); setBusy(false); return; }
        }
        if (!done) { setError('A generalas nem fejezodott be idoben.'); setBusy(false); return; }

        const bytes = base64ToBytes(done.png_base64);
        const blob = new Blob([bytes], { type: 'image/png' });
        setPreview(URL.createObjectURL(blob));
        const r2 = await runFromBlob(blob, 'ai-minta.png');
        setResult(Object.assign({}, r2, {
          url: previewURL(r2.mask, r2.width, r2.height, 1100),
          prompt: done.prompt
        }));

      } else if (tab === 'url') {
        if (!/^https?:\/\//.test(imageUrl.trim())) { setError(t.errUrl); setBusy(false); return; }
        setStage('analyzing');
        const res = await fetch('/api/stencil/from-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: imageUrl.trim(),
            width_mm: widthMm, dpi: dpi,
            title: title || 'link-minta'
          })
        });
        const out = await res.json();
        if (!out.ok) { setError(out.error || t.err); setBusy(false); return; }
        setStage('converting');
        const jobId = out.jobId;
        let done = null;
        for (let i = 0; i < 60; i++) {
          await new Promise(function (r) { setTimeout(r, 1500); });
          const s = await fetch('/api/stencil/from-url?id=' + encodeURIComponent(jobId) + '&what=result');
          const sj = await s.json();
          if (sj.ok && sj.ready) { done = sj.result; break; }
        }
        if (!done) { setError('A feldolgozas nem fejezodott be idoben.'); setBusy(false); return; }
        const bytes = base64ToBytes(done.png_base64);
        const blob = new Blob([bytes], { type: 'image/png' });
        setPreview(URL.createObjectURL(blob));
        const r2 = await runFromBlob(blob, 'link-minta.png');
        setResult(Object.assign({}, r2, { url: previewURL(r2.mask, r2.width, r2.height, 1100) }));

      } else {
        if (!file) { setBusy(false); return; }
        setStage('analyzing');
        const res = await runStencil(file, {
          widthMm: widthMm, dpi: dpi, branch: 'auto',
          baseStroke: 1, bridgePx: 2, minArea: 20, polish: 1,
          fillHoles: false, registration: true, layers: 1
        }, function (s) { setStage(s); });
        setResult(Object.assign({}, res, { url: previewURL(res.mask, res.width, res.height, 1100) }));
      }
    } catch (e) {
      setError(e && e.message ? e.message : t.err);
    } finally {
      setBusy(false); setStage('');
    }
  }, [tab, file, description, imageUrl, widthMm, dpi, styleSlug, bodyPart, title, t, runFromBlob]);

  const reset = useCallback(function () {
    setFile(null); setPreview(null); setResult(null); setError(''); setInfo('');
    setDescription(''); setImageUrl('');
  }, []);

  const r = result && result.report;
  const p = result && result.print;
  const stageLabel = useMemo(function () {
    if (stage === 'generating') return t.generating;
    if (stage === 'converting') return t.converting;
    if (stage === 'decode' || stage === 'measure' || stage === 'analyzing') return t.analyzing;
    return t.work;
  }, [stage, t]);
  const qualityTone = r ? (r.quality === 'hasznalhato' ? 'ok' : (r.quality === 'hidakkal javithato' ? 'warn' : 'bad')) : '';

  return (
    <div className="mt-8">
      {/* ====== FUL-EK ====== */}
      <div className="flex flex-wrap gap-2">
        {[['upload', t.tUpload], ['text', t.tText], ['url', t.tUrl]].map(function (x) {
          const on = tab === x[0];
          return (
            <button key={x[0]} onClick={function () { setTab(x[0]); setResult(null); setError(''); }}
              className={'rounded-lg border px-4 py-2 text-sm transition ' +
                (on ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-stone-800 text-stone-400 hover:border-stone-600')}>
              {x[1]}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/* ====== BAL ====== */}
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
                  <p className="text-stone-200">{t.drop}</p>
                  <p className="mt-2 text-xs text-stone-500">{t.hint}</p>
                </div>
              )}
            </div>
          )}

          {tab === 'text' && (
            <div className="card3d p-6">
              <label className="block">
                <span className="text-sm text-stone-300">{t.descL}</span>
                <textarea value={description} onChange={function (e) { setDescription(e.target.value); }}
                  rows={4} placeholder={EXAMPLES[0]}
                  className="mt-2 w-full rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-sm text-stone-200 outline-none focus:border-amber-600" />
                <span className="mt-1 block text-xs text-stone-500">{t.descHint}</span>
              </label>

              <div className="mt-4">
                <span className="text-xs uppercase tracking-wider text-stone-500">{t.examples}</span>
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
                <span className="text-sm text-stone-300">{t.urlL}</span>
                <input type="url" value={imageUrl} onChange={function (e) { setImageUrl(e.target.value); }}
                  placeholder="https://..."
                  className="mt-2 w-full rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-sm text-stone-200 outline-none focus:border-amber-600" />
                <span className="mt-1 block text-xs text-stone-500">{t.urlHint}</span>
              </label>
              {preview && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={preview} alt="" className="mt-4 mx-auto max-h-56 rounded-lg border border-stone-700" />
              )}
            </div>
          )}

          {/* Beallitasok */}
          <div className="card3d mt-5 p-6">
            <div className="space-y-4">
              {tab === 'text' && (
                <div>
                  <span className="text-sm text-stone-300">{t.styleL}</span>
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
                  <span className="text-xs uppercase tracking-wider text-stone-500">{t.bodyL}</span>
                  <select value={bodyPart} onChange={function (e) { setBodyPart(e.target.value); }}
                    className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-sm text-stone-200">
                    {BODY_PARTS.map(function (b) { return <option key={b.v} value={b.v}>{b.label}</option>; })}
                  </select>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider text-stone-500">{t.dpiL}</span>
                  <select value={dpi} onChange={function (e) { setDpi(+e.target.value); }}
                    className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-sm text-stone-200">
                    <option value={150}>150 DPI</option>
                    <option value={300}>300 DPI</option>
                    <option value={600}>600 DPI</option>
                  </select>
                </div>
              </div>

              <Slider label={t.widthL} value={widthMm} unit="mm" min={20} max={400} step={5} onChange={setWidthMm} />

              <div>
                <span className="text-xs uppercase tracking-wider text-stone-500">Minta neve</span>
                <input type="text" value={title} onChange={function (e) { setTitle(e.target.value); }}
                  placeholder="pl. koponya-propatria"
                  className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-sm text-stone-200 outline-none focus:border-amber-600" />
              </div>
            </div>

            <button onClick={process} disabled={busy || (tab === 'upload' && !file)}
              className={'btn3d mt-6 w-full !py-4 ' + (busy || (tab === 'upload' && !file) ? 'cursor-not-allowed opacity-40' : '')}>
              {busy ? stageLabel : t.go}
            </button>

            {error && <p className="mt-3 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">{t.err}: {error}</p>}
            {info && <p className="mt-3 rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-xs text-stone-400">{info}</p>}
          </div>
        </div>

        {/* ====== JOBB ====== */}
        <div className="card3d p-6">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">{t.res}</h2>

          {!result && !busy && <p className="mt-6 text-sm text-stone-500">{t.empty}</p>}

          {busy && (
            <div className="mt-12 flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-stone-800 border-t-amber-500" />
              <p className="text-sm text-stone-400">{stageLabel}</p>
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
                <Stat label={t.size} value={p.widthMm + ' x ' + p.heightMm + ' mm'} gold />
                <Stat label={t.raster} value={p.px} />
                <Stat label={t.pxmm} value={String(p.pxPerMm)} />
                <Stat label={t.cov} value={r.coverage + '%'} />
                <Stat label={t.br} value={String(r.bridges)} />
                <Stat label={t.islands} value={String(r.islands)} tone={r.islands > 1 ? 'warn' : 'ok'} />
              </div>

              <div className={'mt-4 rounded-lg border px-4 py-3 text-sm ' + (qualityTone === 'ok' ? 'border-emerald-900/60 bg-emerald-950/30 text-emerald-300' : qualityTone === 'warn' ? 'border-amber-900/60 bg-amber-950/30 text-amber-300' : 'border-red-900/60 bg-red-950/30 text-red-300')}>
                <div className="font-semibold">{t.quality}: {r.quality}</div>
                <div className="mt-1 text-xs opacity-90">{r.verdictText || ''}</div>
              </div>

              {result.prompt && (
                <details className="mt-4 rounded-lg border border-stone-800 bg-stone-950/50 px-4 py-3">
                  <summary className="cursor-pointer text-xs text-stone-400">{t.prompt}</summary>
                  <p className="mt-2 text-xs leading-relaxed text-stone-500">{result.prompt}</p>
                </details>
              )}

              <button
                onClick={async function () {
                  const png = await maskToPNGBytes(result.mask, result.width, result.height, { transparent: true });
                  downloadBlob(png, 'inkforge-' + (title || 'stencil') + '-' + p.widthMm + 'mm.png', 'image/png');
                }}
                className="btn3d mt-5 w-full !py-3.5">{t.dl}</button>

              <p className="mt-3 text-xs leading-relaxed text-stone-500">{t.printNote}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
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
