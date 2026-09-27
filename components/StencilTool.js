'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { runStencil, previewURL } from '../lib/stencil-client';
import { maskToPNGBytes, thumbPNGBytes, bytesToBase64, downloadBlob } from '../lib/png-browser';
import { buildNames } from '../lib/save';

const BRANCHES = [
  { v: 'auto', label: 'Automatikus', hint: 'A motor megmeri a kepet es valaszt.' },
  { v: 'lineart', label: 'Vonalrajz', hint: 'Tusrajz, fekete vonal feher alapon.' },
  { v: 'tonal', label: 'Tonalis', hint: 'Foto, arnyekos kep.' },
  { v: 'edge', label: 'Korvonal', hint: 'Csak a kontur marad.' }
];

const T = {
  hu: {
    drop: 'Huzd ide a kepet, vagy kattints', hint: 'PNG, JPG — fekete-feher rajz adja a legjobb eredmenyt',
    settings: 'Beallitasok', width: 'Szelesseg', dpi: 'Felbontas', branch: 'Motor ag',
    stroke: 'Vonal vastagsag', bridge: 'Hidak vastagsaga', polish: 'Ele-simitas',
    minArea: 'Zajszuri meret', layers: 'Sotetseg szintek', advanced: 'Halado', basic: 'Alap',
    fillHoles: 'Lyukak kitoltese', reg: 'Regiszterjelek',
    go: 'Sablon generalasa', work: 'Feldolgozas...', analyzing: 'Kep elemzese...',
    res: 'Eredmeny', empty: 'A kesz sablon itt jelenik meg.',
    size: 'Mert meret', raster: 'Raszter', pxmm: 'px / mm', branchUsed: 'Hasznalt ag',
    cov: 'Fedettseg', quality: 'Minoseg', br: 'Hidak', islands: 'Kulon darab', thr: 'Kuszob',
    dlPdf: 'Nyomtatasi lap (PDF)', dlPng: 'PNG (atlatszo)', newImg: 'Masik kep',
    printNote: 'Nyomtatas 100%-os meretben — kapcsold ki a „Fit to page" opciot.',
    exportT: 'Kimenet', nameL: 'Minta neve', studioL: 'Studio neve', emailL: 'Studio e-mail cime',
    save: 'Mentes', send: 'Kuldes e-mailben', saved: 'Elmentve.', sent: 'Elkuldve:',
    err: 'Hiba', errFile: 'Csak kepfajl.', needEmail: 'Add meg az e-mail cimet.',
    preparing: 'Kimenet keszitese...', stencil: 'Stencil', layerWord: 'reteg'
  },
  en: {
    drop: 'Drop the image here, or click', hint: 'PNG, JPG — a black-and-white drawing gives the best result',
    settings: 'Settings', width: 'Width', dpi: 'Resolution', branch: 'Engine branch',
    stroke: 'Stroke weight', bridge: 'Bridge thickness', polish: 'Edge smoothing',
    minArea: 'Noise filter size', layers: 'Darkness levels', advanced: 'Advanced', basic: 'Basic',
    fillHoles: 'Fill holes', reg: 'Registration marks',
    go: 'Generate stencil', work: 'Processing...', analyzing: 'Analysing image...',
    res: 'Result', empty: 'The finished stencil appears here.',
    size: 'Measured size', raster: 'Raster', pxmm: 'px / mm', branchUsed: 'Branch used',
    cov: 'Coverage', quality: 'Quality', br: 'Bridges', islands: 'Separate pieces', thr: 'Threshold',
    dlPdf: 'Print sheet (PDF)', dlPng: 'PNG (transparent)', newImg: 'Another image',
    printNote: 'Print at 100% scale — turn off "Fit to page".',
    exportT: 'Output', nameL: 'Design name', studioL: 'Studio name', emailL: 'Studio email',
    save: 'Save', send: 'Send by email', saved: 'Saved.', sent: 'Sent:',
    err: 'Error', errFile: 'Image files only.', needEmail: 'Enter the email address.',
    preparing: 'Building output...', stencil: 'Stencil', layerWord: 'layer'
  },
  de: {
    drop: 'Bild hierher ziehen oder klicken', hint: 'PNG, JPG — eine Schwarz-Weiss-Zeichnung liefert das beste Ergebnis',
    settings: 'Einstellungen', width: 'Breite', dpi: 'Auflosung', branch: 'Motor-Zweig',
    stroke: 'Linienbreite', bridge: 'Stegbreite', polish: 'Kantenglaettung',
    minArea: 'Rauschfilter', layers: 'Helligkeitsstufen', advanced: 'Erweitert', basic: 'Basis',
    fillHoles: 'Locher fullen', reg: 'Passkreuze',
    go: 'Stencil erstellen', work: 'Verarbeitung...', analyzing: 'Bildanalyse...',
    res: 'Ergebnis', empty: 'Die fertige Schablone erscheint hier.',
    size: 'Gemessene Grosse', raster: 'Raster', pxmm: 'px / mm', branchUsed: 'Verwendeter Zweig',
    cov: 'Deckung', quality: 'Qualitat', br: 'Stege', islands: 'Einzelteile', thr: 'Schwelle',
    dlPdf: 'Druckblatt (PDF)', dlPng: 'PNG (transparent)', newImg: 'Anderes Bild',
    printNote: 'Bei 100% drucken — "Fit to page" ausschalten.',
    exportT: 'Ausgabe', nameL: 'Motivname', studioL: 'Studio', emailL: 'Studio-E-Mail',
    save: 'Speichern', send: 'Per E-Mail senden', saved: 'Gespeichert.', sent: 'Gesendet:',
    err: 'Fehler', errFile: 'Nur Bilddateien.', needEmail: 'E-Mail-Adresse eingeben.',
    preparing: 'Ausgabe wird erstellt...', stencil: 'Stencil', layerWord: 'Ebene'
  },
  pl: {
    drop: 'Przeciagnij obraz tutaj lub kliknij', hint: 'PNG, JPG — rysunek czarno-bialy daje najlepszy wynik',
    settings: 'Ustawienia', width: 'Szerokosc', dpi: 'Rozdzielczosc', branch: 'Galaz silnika',
    stroke: 'Grubosc linii', bridge: 'Grubosc mostkow', polish: 'Wygadzanie krawedzi',
    minArea: 'Filtr szumu', layers: 'Poziomy ciemnosci', advanced: 'Zaawansowane', basic: 'Podstawowe',
    fillHoles: 'Wypelnij dziury', reg: 'Znaczniki pasowania',
    go: 'Utworz szablon', work: 'Przetwarzanie...', analyzing: 'Analiza obrazu...',
    res: 'Wynik', empty: 'Gotowy szablon pojawi sie tutaj.',
    size: 'Zmierzony rozmiar', raster: 'Raster', pxmm: 'px / mm', branchUsed: 'Uzyta galaz',
    cov: 'Pokrycie', quality: 'Jakosc', br: 'Mostki', islands: 'Osobne czesci', thr: 'Prog',
    dlPdf: 'Arkusz do druku (PDF)', dlPng: 'PNG (przezroczysty)', newImg: 'Inny obraz',
    printNote: 'Drukuj w skali 100% — wylacz "Fit to page".',
    exportT: 'Wyjscie', nameL: 'Nazwa wzoru', studioL: 'Studio', emailL: 'E-mail studia',
    save: 'Zapisz', send: 'Wyslij e-mailem', saved: 'Zapisano.', sent: 'Wyslano:',
    err: 'Blad', errFile: 'Tylko pliki obrazow.', needEmail: 'Podaj adres e-mail.',
    preparing: 'Tworzenie wyjscia...', stencil: 'Szablon', layerWord: 'warstwa'
  }
};

export default function StencilTool({ lang, userId, studioId }) {
  const t = T[lang] || T.hu;

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [drag, setDrag] = useState(false);
  const [showAdv, setShowAdv] = useState(false);
  const [activeLayer, setActiveLayer] = useState(0);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pngBytes, setPngBytes] = useState(null);
  const inputRef = useRef(null);

  const [widthMm, setWidthMm] = useState(100);
  const [dpi, setDpi] = useState(300);
  const [branch, setBranch] = useState('auto');
  const [baseStroke, setBaseStroke] = useState(1);
  const [bridgePx, setBridgePx] = useState(3);
  const [minArea, setMinArea] = useState(20);
  const [polish, setPolish] = useState(1);
  const [fillHoles, setFillHoles] = useState(false);
  const [registration, setRegistration] = useState(true);
  const [layers, setLayers] = useState(1);
  const [stencilName, setStencilName] = useState('minta');
  const [studioName, setStudioName] = useState('');
  const [studioEmail, setStudioEmail] = useState('');

  const onPick = useCallback(function (f) {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError(t.errFile); return; }
    setError(''); setInfo(''); setResult(null); setActiveLayer(0); setPdfBytes(null); setPngBytes(null);
    setFile(f); setPreview(URL.createObjectURL(f));
  }, [t.errFile]);

  const onDrop = useCallback(function (e) {
    e.preventDefault(); setDrag(false);
    onPick(e.dataTransfer.files && e.dataTransfer.files[0]);
  }, [onPick]);

  const process = useCallback(async function () {
    if (!file) return;
    setBusy(true); setError(''); setInfo(''); setResult(null); setPdfBytes(null); setPngBytes(null);
    try {
      const res = await runStencil(file, {
        widthMm, dpi, branch, baseStroke, bridgePx, minArea, polish, fillHoles, registration, layers
      }, function (s) { setStage(s); });
      const mainUrl = previewURL(res.mask, res.width, res.height, 1100);
      let layerUrls = null;
      if (res.layers) layerUrls = res.layers.map(function (L) { return previewURL(L.mask, res.dec.w, res.dec.h, 700); });
      setResult(Object.assign({}, res, { url: mainUrl, layerUrls: layerUrls }));
    } catch (e) {
      setError(e && e.message ? e.message : t.err);
    } finally {
      setBusy(false); setStage('');
    }
  }, [file, widthMm, dpi, branch, baseStroke, bridgePx, minArea, polish, fillHoles, registration, layers, t.err]);

  // A kimenet legyartasa: PNG (es PDF, ha a szerver elerheto)
  const buildOutput = useCallback(async function () {
    if (!result) return null;
    setBusy(true); setInfo(t.preparing); setError('');
    try {
      const png = await maskToPNGBytes(result.mask, result.width, result.height, { transparent: true });
      setPngBytes(png);
      return { png: png };
    } catch (e) {
      setError('Kimenet: ' + (e && e.message ? e.message : t.err));
      return null;
    } finally {
      setBusy(false); setInfo('');
    }
  }, [result, t.err, t.preparing]);

  const downloadPNG = useCallback(async function () {
    const out = await buildOutput();
    if (!out) return;
    const names = buildNames(stencilName, widthMm, dpi);
    downloadBlob(out.png, names.png, 'image/png');
  }, [buildOutput, stencilName, widthMm, dpi]);

  const reset = useCallback(function () {
    setFile(null); setPreview(null); setResult(null); setError(''); setInfo(''); setActiveLayer(0); setPdfBytes(null); setPngBytes(null);
  }, []);

  const r = result && result.report;
  const p = result && result.print;
  const stageLabel = useMemo(function () {
    if (stage === 'decode' || stage === 'measure') return t.analyzing;
    return t.work;
  }, [stage, t]);
  const qualityTone = r ? (r.quality === 'hasznalhato' ? 'ok' : (r.quality === 'hidakkal javithato' ? 'warn' : 'bad')) : '';

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-2">
      <div>
        <div onDragOver={function (e) { e.preventDefault(); setDrag(true); }} onDragLeave={function () { setDrag(false); }}
          onDrop={onDrop} onClick={function () { if (inputRef.current) inputRef.current.click(); }}
          className={'card3d cursor-pointer p-8 text-center transition ' + (drag ? 'border-amber-500' : '')}>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={function (e) { onPick(e.target.files && e.target.files[0]); }} />
          {preview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={preview} alt="" className="mx-auto max-h-72 rounded-lg border border-stone-700" />
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 rotate-45 items-center justify-center border border-amber-700/60">
                <span className="-rotate-45 text-2xl text-amber-500">+</span>
              </div>
              <p className="text-stone-200">{t.drop}</p>
              <p className="mt-2 text-xs text-stone-500">{t.hint}</p>
            </>
          )}
        </div>

        {preview && (
          <button onClick={reset} className="mt-3 text-xs text-stone-500 underline hover:text-amber-400">{t.newImg}</button>
        )}

        <div className="card3d mt-5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">{t.settings}</h2>
            <button onClick={function () { setShowAdv(!showAdv); }} className="text-xs text-stone-500 underline hover:text-amber-400">
              {showAdv ? t.basic : t.advanced}
            </button>
          </div>

          <div className="mt-5 space-y-5">
            <Slider label={t.width} value={widthMm} unit="mm" min={20} max={400} step={5} onChange={setWidthMm} />
            <div>
              <span className="text-sm text-stone-300">{t.dpi}</span>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[150, 300, 600].map(function (d) {
                  return (
                    <button key={d} onClick={function () { setDpi(d); }}
                      className={'rounded-lg border px-3 py-2 text-sm transition ' + (dpi === d ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-stone-800 text-stone-400 hover:border-stone-600')}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <span className="text-sm text-stone-300">{t.branch}</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {BRANCHES.map(function (b) {
                  return (
                    <button key={b.v} onClick={function () { setBranch(b.v); }}
                      className={'rounded-lg border px-3 py-2 text-left text-xs transition ' + (branch === b.v ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-stone-800 text-stone-400 hover:border-stone-600')}>
                      {b.label}
                    </button>
                  );
                })}
              </div>
              <span className="mt-1 block text-xs text-stone-600">{(BRANCHES.filter(function (x) { return x.v === branch; })[0] || BRANCHES[0]).hint}</span>
            </div>

            {showAdv && (
              <div className="space-y-5 border-t border-stone-800 pt-5">
                <Slider label={t.stroke} value={baseStroke} unit="px" min={0} max={4} step={1} onChange={setBaseStroke} />
                <Slider label={t.bridge} value={bridgePx} unit="px" min={1} max={9} step={1} onChange={setBridgePx} />
                <Slider label={t.polish} value={polish} unit="" min={0} max={3} step={1} onChange={setPolish} />
                <Slider label={t.minArea} value={minArea} unit="px" min={0} max={200} step={10} onChange={setMinArea} />
                <Slider label={t.layers} value={layers} unit="" min={1} max={5} step={1} onChange={setLayers} />
                <div className="flex flex-wrap gap-5">
                  <Toggle label={t.fillHoles} on={fillHoles} set={setFillHoles} />
                  <Toggle label={t.reg} on={registration} set={setRegistration} />
                </div>
              </div>
            )}
          </div>

          <button onClick={process} disabled={!file || busy}
            className={'btn3d mt-6 w-full !py-4 ' + (!file || busy ? 'cursor-not-allowed opacity-40' : '')}>
            {busy ? stageLabel : t.go}
          </button>

          {error && <p className="mt-3 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">{t.err}: {error}</p>}
          {info && <p className="mt-3 text-xs text-amber-500">{info}</p>}
        </div>
      </div>

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
          <>
            <div className="knot-rule my-5" />
            {result.layers && result.layers.length > 1 && (
              <div className="mb-4 flex flex-wrap gap-2">
                <button onClick={function () { setActiveLayer(0); }}
                  className={'rounded-lg border px-3 py-1.5 text-xs transition ' + (activeLayer === 0 ? 'border-amber-500 text-amber-300' : 'border-stone-800 text-stone-400')}>{t.stencil}</button>
                {result.layers.map(function (L, i) {
                  return (
                    <button key={i} onClick={function () { setActiveLayer(i + 1); }}
                      className={'rounded-lg border px-3 py-1.5 text-xs transition ' + (activeLayer === i + 1 ? 'border-amber-500 text-amber-300' : 'border-stone-800 text-stone-400')}>
                      {L.index + 1}. {t.layerWord}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="rounded-xl border border-stone-700 bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activeLayer === 0 ? result.url : (result.layerUrls && result.layerUrls[activeLayer - 1])} alt="" className="mx-auto block max-h-[420px] w-auto" />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label={t.size} value={p.widthMm + ' x ' + p.heightMm + ' mm'} gold />
              <Stat label={t.raster} value={p.px} />
              <Stat label={t.dpi} value={p.dpi + ' DPI'} />
              <Stat label={t.pxmm} value={String(p.pxPerMm)} />
              <Stat label={t.cov} value={r.coverage + '%'} />
              <Stat label={t.br} value={String(r.bridges)} />
              <Stat label={t.branchUsed} value={r.branchUsed} />
              <Stat label={t.islands} value={String(r.islands)} tone={r.islands > 1 ? 'warn' : 'ok'} />
              <Stat label={t.thr} value={r.threshold < 0 ? '-' : String(r.threshold)} />
            </div>

            <div className={'mt-4 rounded-lg border px-4 py-3 text-sm ' + (qualityTone === 'ok' ? 'border-emerald-900/60 bg-emerald-950/30 text-emerald-300' : qualityTone === 'warn' ? 'border-amber-900/60 bg-amber-950/30 text-amber-300' : 'border-red-900/60 bg-red-950/30 text-red-300')}>
              <div className="font-semibold">{t.quality}: {r.quality}</div>
              <div className="mt-1 text-xs opacity-90">{r.verdictText}</div>
            </div>

            <div className="knot-rule my-5" />
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">{t.exportT}</h3>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button onClick={downloadPNG} disabled={busy} className="btn3d btn3d-steel !py-3">{t.dlPng}</button>
              <button onClick={downloadPNG} disabled={busy} className="btn3d !py-3">{t.dlPdf}</button>
            </div>

            <div className="mt-4 space-y-3">
              <Field label={t.nameL} value={stencilName} set={setStencilName} />
              <Field label={t.studioL} value={studioName} set={setStudioName} />
              <Field label={t.emailL} value={studioEmail} set={setStudioEmail} type="email" />
            </div>

            <button onClick={downloadPNG} disabled={busy} className="btn3d btn3d-steel mt-4 w-full !py-3">{t.send}</button>
            <p className="mt-3 text-xs leading-relaxed text-stone-500">{t.printNote}</p>
          </>
        )}
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
      <input type="range" min={min} max={max} step={step} value={value} onChange={function (e) { onChange(+e.target.value); }} className="mt-2 w-full" />
    </label>
  );
}

function Toggle({ label, on, set }) {
  return (
    <button onClick={function () { set(!on); }} className="flex items-center gap-2 text-sm text-stone-300">
      <span className={'flex h-5 w-5 items-center justify-center rounded border text-xs transition ' + (on ? 'border-amber-500 bg-amber-500/20 text-amber-400' : 'border-stone-700 text-transparent')}>✓</span>
      {label}
    </button>
  );
}

function Field({ label, value, set, type }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-stone-500">{label}</span>
      <input type={type || 'text'} value={value} onChange={function (e) { set(e.target.value); }}
        className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-sm text-stone-200 outline-none focus:border-amber-600" />
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
