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
function maskToCanvas(mask, w, h, invert) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  const data = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    let v = mask[i] > 0 ? 0 : 255;
    if (invert) v = 255 - v;
    data.data[i * 4] = v;
    data.data[i * 4 + 1] = v;
    data.data[i * 4 + 2] = v;
    data.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  return cv;
}
import { canvasToPNGBytes, downloadBlob } from '../lib/png-browser';
import { calculateA4Layout, mmToPx } from '../lib/print-layout';

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
  const [heightMm, setHeightMm] = useState(100);
  const [lockAspect, setLockAspect] = useState(true);
  const [sourceAspect, setSourceAspect] = useState(1);
  const [dpi, setDpi] = useState(300);
  const [styleSlug, setStyleSlug] = useState('linework');
  const [bodyPart, setBodyPart] = useState('');
  const [title, setTitle] = useState('');
  const [imageMode, setImageMode] = useState('image_to_image_stencil');
  const [imagePrompt, setImagePrompt] = useState('');
  const [textMode, setTextMode] = useState('text_to_stencil');
  function setTargetWidth(value) {
    const v = Math.max(20, Math.min(700, Number(value) || 20));
    setWidthMm(v);
    if (lockAspect) setHeightMm(Math.round(v * sourceAspect * 10) / 10);
  }

  function setTargetHeight(value) {
    const v = Math.max(20, Math.min(1000, Number(value) || 20));
    setHeightMm(v);
    if (lockAspect && sourceAspect > 0) setWidthMm(Math.round(v / sourceAspect * 10) / 10);
  }

  function setBackPreset() {
    setWidthMm(450);
    setHeightMm(600);
    setLockAspect(false);
    setInfo('Teljes hát: 450 × 600 mm. Az A4 export automatikusan darabolja és illeszthető jeleket tesz minden lapra.');
  }

  const onPick = useCallback(function (f) {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('Csak kepfajl.'); return; }
    setError(''); setInfo(''); setResult(null);
    const objectUrl = URL.createObjectURL(f);
    setFile(f); setPreview(objectUrl);

    const img = new Image();
    img.onload = function () {
      const ratio = (img.naturalHeight || img.height || 1) / Math.max(1, img.naturalWidth || img.width || 1);
      setSourceAspect(ratio);
      if (lockAspect) setHeightMm(Math.round(widthMm * ratio * 10) / 10);
    };
    img.onerror = function () { setError('A kép mérete nem olvasható.'); };
    img.src = objectUrl;
  }, [lockAspect, widthMm]);

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
    const previewSrc = URL.createObjectURL(blob);

    const img = new Image();
    const loaded = new Promise(function (resolve, reject) {
      img.onload = resolve;
      img.onerror = function () { reject(new Error('A RunPod PNG nem olvasható.')); };
    });
    img.src = previewSrc;
    await loaded;

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const rgba = ctx.getImageData(0, 0, w, h).data;
    const mask = new Uint8Array(w * h);
    let ink = 0;
    for (let i = 0; i < w * h; i++) {
      const a = rgba[i * 4 + 3];
      const v = (rgba[i * 4] + rgba[i * 4 + 1] + rgba[i * 4 + 2]) / 3;
      if (a > 20 && v < 245) { mask[i] = 255; ink++; }
    }

    const coverage = extra && extra.coverage != null
      ? Number(extra.coverage)
      : Math.round((ink / Math.max(1, mask.length)) * 10000) / 100;
    const measuredHeightMm = extra && extra.heightMm != null
      ? Number(extra.heightMm)
      : Math.round(widthMm * h / Math.max(1, w) * 100) / 100;
    const effectiveHeightMm = lockAspect
      ? Math.round(widthMm * h / Math.max(1, w) * 10) / 10
      : measuredHeightMm;
    setSourceAspect(h / Math.max(1, w));
    setHeightMm(effectiveHeightMm);
    const pxPerMm = dpi / 25.4;

    let generatedUrl = null;
    if (extra && extra.generated_png_base64) {
      const gbin = atob(extra.generated_png_base64);
      const gbytes = new Uint8Array(gbin.length);
      for (let i = 0; i < gbin.length; i++) gbytes[i] = gbin.charCodeAt(i);
      generatedUrl = URL.createObjectURL(new Blob([gbytes], { type: 'image/png' }));
    }

    setPreview(previewSrc);
    setResult({
      mask: mask,
      width: w,
      height: h,
      url: previewSrc,
      generatedUrl: generatedUrl,
      report: {
        branchUsed: extra && extra.mode ? extra.mode : 'runpod',
        bridges: extra && extra.bridges != null ? extra.bridges : 0,
        islands: extra && extra.islands != null ? extra.islands : 1,
        coverage: coverage,
        quality: extra && extra.quality ? extra.quality : 'hasznalhato',
        verdictText: extra && extra.verdictText ? extra.verdictText : 'Éles, nyomtatható stencil-vonalrajz.'
      },
      print: {
        widthMm: widthMm,
        heightMm: effectiveHeightMm,
        pxPerMm: Math.round(pxPerMm * 100) / 100,
        dpi: dpi,
        px: w + ' x ' + h
      },
      gpu: {
        ms: extra && (extra.gpuMs || extra.executionMs) || 0,
        engine: extra && (extra.engine || 'InkForge RunPod')
      },
      gpuCoverage: coverage,
      prompt: extra && extra.prompt ? extra.prompt : null,
      isStencil: !(extra && (extra.mode === 'image_to_image' || extra.mode === 'text_to_image'))
    });
  }

  async function waitRunpod(route, out) {
    const id = out.runpodId || out.jobId;
    if (!id) throw new Error('A RunPod nem adott job azonosítót.');

    const qs = new URLSearchParams();
    qs.set('id', id);
    if (out.stencilId) qs.set('stencil', out.stencilId);
    if (out.studioId) qs.set('studio', out.studioId);
    if (out.widthMm) qs.set('mm', out.widthMm);
    if (out.heightMm) qs.set('hmm', out.heightMm);
    if (out.dpi) qs.set('dpi', out.dpi);

    for (let i = 0; i < 300; i++) {
      await new Promise(function (r) { setTimeout(r, 2000); });
      const s = await fetch(route + '?' + qs.toString());
      const sj = await s.json().catch(function () { return {}; });
      if (sj.failed) throw new Error(sj.error || 'A RunPod generalas sikertelen.');
      if (sj.ok && sj.ready && sj.png_base64) return sj;
    }
    throw new Error('A RunPod feladat időkorlátja lejárt. Ellenőrizd a worker logját.');
  }

  async function compressForRunpod(file) {
    if (!file || !file.type.startsWith('image/')) return file;
    const maxSide = 1600;
    const img = new Image();
    const src = URL.createObjectURL(file);
    try {
      img.src = src;
      await new Promise(function (resolve, reject) {
        img.onload = resolve;
        img.onerror = function () { reject(new Error('A kép nem olvasható.')); };
      });
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const blob = await new Promise(function (resolve) {
        cv.toBlob(resolve, 'image/jpeg', 0.86);
      });
      return blob ? new File([blob], 'inkforge-source.jpg', { type: 'image/jpeg' }) : file;
    } finally {
      URL.revokeObjectURL(src);
    }
  }

  async function runViaGenerate(f) {
    setStage('analyzing');
    const uploadFile = await compressForRunpod(f);
    const fd = new FormData();
    fd.append('image', uploadFile);
    fd.append('mode', imageMode);
    fd.append('target_coverage', '0.06');
    fd.append('max_dim', '1024');
    fd.append('strength', '0.38');
    fd.append('width_mm', String(widthMm));
    fd.append('height_mm', String(heightMm));
    fd.append('dpi', String(dpi));
    fd.append('title', title || (f.name || 'stencil').replace(/\.[^.]+$/, ''));
    if (imagePrompt.trim()) fd.append('prompt', imagePrompt.trim());

    const res = await fetch('/api/stencil/generate', { method: 'POST', body: fd });
    const out = await res.json().catch(function () { return {}; });
    if (!res.ok || !out.ok) throw new Error(out.error || 'RunPod indítási hiba.');

    setStage('gpu');
    const done = await waitRunpod('/api/stencil/generate', out);
    await finishFromGpuPng(done.png_base64, done);
  }

  const process = useCallback(async function () {
    setBusy(true); setError(''); setInfo(''); setResult(null);
    const iv = startClock();
    try {
      const hp = await fetch('/api/stencil/health');
      const h = await hp.json();
      setEngineMode(h.mode || 'browser');
      const gpuOn = h.mode === 'runpod';
      if (!gpuOn) throw new Error('A RunPod GPU motor nincs beállítva. Az InkForge most kizárólag RunPoddal generál.');

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
            width_mm: widthMm, height_mm: heightMm, dpi: dpi,
            title: title || description.trim().slice(0, 60),
            mode: textMode
          })
        });
        const out = await res.json();
        if (!out.ok) throw new Error(out.error || 'Hiba');
        if (out.embeddedText) setInfo('Felismerve: ' + out.embeddedText);

        const done = await waitRunpod('/api/stencil/from-text', out);
        await finishFromGpuPng(done.png_base64, done);

      } else if (tab === 'url') {
        if (!/^https?:\/\//.test(imageUrl.trim())) throw new Error('Add meg a kep linkjet.');
        setStage('analyzing');
        const res = await fetch('/api/stencil/from-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: imageUrl.trim(), width_mm: widthMm, height_mm: heightMm, dpi: dpi,
            mode: imageMode,
            prompt: imagePrompt.trim(),
            target_coverage: 0.06, title: title || 'link-minta'
          })
        });
        const out = await res.json();
        if (!out.ok) throw new Error(out.error || 'Hiba');

        const done = await waitRunpod('/api/stencil/from-url', out);
        await finishFromGpuPng(done.png_base64, done);

      } else {
        if (!file) { setBusy(false); clearInterval(iv); return; }
        await runViaGenerate(file);
      }
    } catch (e) {
      setError(e && e.message ? e.message : 'Hiba');
    } finally {
      clearInterval(iv);
      setBusy(false); setStage('');
    }
  }, [tab, file, description, imageUrl, widthMm, heightMm, dpi, styleSlug, bodyPart, title, imageMode, imagePrompt]);

  
  function drawCross(ctx, x, y, half, lineWidth) {
    ctx.save();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(x - half, y); ctx.lineTo(x + half, y);
    ctx.moveTo(x, y - half); ctx.lineTo(x, y + half);
    ctx.stroke();
    ctx.restore();
  }

  function drawA4Guides(ctx, layout, page, dpi) {
    const s = mmToPx(1, dpi);
    const left = mmToPx(layout.marginMm, dpi);
    const top = mmToPx(layout.marginMm, dpi);
    const right = mmToPx(layout.marginMm + layout.artWidthMm, dpi);
    const bottom = mmToPx(layout.marginMm + layout.artHeightMm, dpi);
    const guide = Math.max(1, mmToPx(0.25, dpi));
    const cross = Math.max(4, mmToPx(2.5, dpi));

    ctx.save();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = guide;
    ctx.setLineDash([Math.max(2, mmToPx(2, dpi)), Math.max(2, mmToPx(2, dpi))]);
    ctx.strokeRect(left, top, right - left, bottom - top);
    ctx.setLineDash([]);

    drawCross(ctx, left, top, cross, guide);
    drawCross(ctx, right, top, cross, guide);
    drawCross(ctx, left, bottom, cross, guide);
    drawCross(ctx, right, bottom, cross, guide);

    if (page.col > 0) {
      drawCross(ctx, left, (top + bottom) / 2, cross, guide);
      ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, bottom); ctx.stroke();
    }
    if (page.col < layout.cols - 1) {
      drawCross(ctx, right, (top + bottom) / 2, cross, guide);
      ctx.beginPath(); ctx.moveTo(right, top); ctx.lineTo(right, bottom); ctx.stroke();
    }
    if (page.row > 0) {
      drawCross(ctx, (left + right) / 2, top, cross, guide);
      ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(right, top); ctx.stroke();
    }
    if (page.row < layout.rows - 1) {
      drawCross(ctx, (left + right) / 2, bottom, cross, guide);
      ctx.beginPath(); ctx.moveTo(left, bottom); ctx.lineTo(right, bottom); ctx.stroke();
    }

    ctx.fillStyle = '#111';
    ctx.font = Math.max(12, mmToPx(3, dpi)) + 'px Arial';
    ctx.fillText('INKFORGE PRO • A4 ' + (page.index + 1) + '/' + layout.pageCount, left, Math.max(mmToPx(3, dpi), top - mmToPx(1.5, dpi)));
    ctx.font = Math.max(10, mmToPx(2.3, dpi)) + 'px Arial';
    ctx.fillText(
      layout.targetWidthMm.toFixed(1) + ' × ' + layout.targetHeightMm.toFixed(1) + ' mm • ' +
      dpi + ' DPI • 100% / ACTUAL SIZE',
      left,
      ctx.canvas.height - mmToPx(2, dpi)
    );
    ctx.restore();
  }

  async function renderA4Tile(resultObj, layout, page, dpi) {
    const canvas = document.createElement('canvas');
    canvas.width = mmToPx(layout.pageWidthMm, dpi);
    canvas.height = mmToPx(layout.pageHeightMm, dpi);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    const source = maskToCanvas(resultObj.mask, resultObj.width, resultObj.height, false);
    const sx = (page.xMm / layout.targetWidthMm) * resultObj.width;
    const sy = (page.yMm / layout.targetHeightMm) * resultObj.height;
    const sw = (page.cropWidthMm / layout.targetWidthMm) * resultObj.width;
    const sh = (page.cropHeightMm / layout.targetHeightMm) * resultObj.height;
    const dx = mmToPx(layout.marginMm, dpi);
    const dy = mmToPx(layout.marginMm, dpi);
    const dw = mmToPx(page.cropWidthMm, dpi);
    const dh = mmToPx(page.cropHeightMm, dpi);

    if (sw > 0 && sh > 0 && dw > 0 && dh > 0) {
      ctx.drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh);
    }
    drawA4Guides(ctx, layout, page, dpi);
    return canvas;
  }

  async function downloadExactStencilPng() {
    if (!result || result.isStencil === false) return;
    const pxW = mmToPx(p.widthMm, p.dpi);
    const pxH = mmToPx(p.heightMm, p.dpi);
    const megaPixels = (pxW * pxH) / 1000000;
    if (megaPixels > 60) throw new Error('A teljes méretű PNG ' + megaPixels.toFixed(0) + ' MP. Nagy mintánál használd az A4 PRO csomagot.');
    const canvas = document.createElement('canvas');
    canvas.width = pxW; canvas.height = pxH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, pxW, pxH);
    ctx.imageSmoothingEnabled = false;
    const source = maskToCanvas(result.mask, result.width, result.height, false);
    ctx.drawImage(source, 0, 0, pxW, pxH);
    const bytes = await canvasToPNGBytes(canvas, p.dpi);
    downloadBlob(bytes, 'inkforge-' + (title || 'stencil') + '-' + p.widthMm + 'x' + p.heightMm + 'mm-' + p.dpi + 'dpi.png', 'image/png');
  }

  async function downloadA4Package() {
    if (!result || result.isStencil === false) return;
    const layout = calculateA4Layout(p.widthMm, p.heightMm, { orientation: 'auto', marginMm: 3, overlapMm: 3 });
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const safeTitle = (title || 'stencil').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() || 'stencil';

    for (let i = 0; i < layout.pages.length; i++) {
      const page = layout.pages[i];
      setInfo('A4 lap ' + (i + 1) + '/' + layout.pageCount + ' készül…');
      const canvas = await renderA4Tile(result, layout, page, p.dpi);
      const bytes = await canvasToPNGBytes(canvas, p.dpi);
      zip.file(safeTitle + '-A4-' + String(i + 1).padStart(2, '0') + '-of-' + String(layout.pageCount).padStart(2, '0') + '.png', bytes);
      canvas.width = 1; canvas.height = 1;
      await new Promise(function (resolve) { setTimeout(resolve, 0); });
    }

    zip.file('NYOMTATASI-UTMUTATO.txt', [
      'INKFORGE PRO STENCIL',
      '',
      'Valódi méret: ' + p.widthMm.toFixed(1) + ' × ' + p.heightMm.toFixed(1) + ' mm',
      'Felbontás: ' + p.dpi + ' DPI',
      'A4 lapok: ' + layout.pageCount + ' (' + layout.cols + ' × ' + layout.rows + ', ' + layout.orientation + ')',
      'Illesztési átfedés: ' + layout.overlapMm.toFixed(1) + ' mm',
      '',
      'NYOMTATÁS: 100% / ACTUAL SIZE. FIT TO PAGE = KIKAPCSOLVA.',
      'Az A4 lapokon azonosító és illesztési vonalak, valamint kis keresztjelek vannak.',
      'A szomszédos lapokat az azonos él- és keresztjelekhez kell igazítani.'
    ].join('\n'));

    setInfo('A4 ZIP összeállítása…');
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    downloadBlob(new Uint8Array(await blob.arrayBuffer()), safeTitle + '-A4-stencil-' + p.dpi + 'dpi.zip', 'application/zip');
    setInfo('Kész: ' + layout.pageCount + ' A4 lap.');
  }

  const r = result && result.report;
  const p = result && result.print;

  const a4Layout = result && result.isStencil !== false && p
    ? calculateA4Layout(p.widthMm, p.heightMm, { orientation: 'auto', marginMm: 5, overlapMm: 8 })
    : null;
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
              <div className="mb-5 grid gap-3">
                <label className="block text-left">
                  <span className="text-xs uppercase tracking-wider text-stone-500">Kép feldolgozás</span>
                  <select value={imageMode} onChange={function (e) { setImageMode(e.target.value); }}
                    className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-sm text-stone-200">
                    <option value="image_to_image_stencil">AI kép → kép → éles stencil</option>
                    <option value="image_to_stencil">Kép → közvetlen éles stencil</option>
                    <option value="image_to_image">AI kép → kép</option>
                  </select>
                </label>
                <label className="block text-left">
                  <span className="text-xs uppercase tracking-wider text-stone-500">Kiegészítő prompt</span>
                  <input value={imagePrompt} onChange={function (e) { setImagePrompt(e.target.value); }}
                    placeholder="pl. preserve face, simplify details, bold clean tattoo lines"
                    className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-sm text-stone-200 outline-none focus:border-amber-600" />
                </label>
              </div>
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
              <div className="mb-5">
                <span className="text-xs uppercase tracking-wider text-stone-500">Kimenet</span>
                <select value={textMode} onChange={function (e) { setTextMode(e.target.value); }}
                  className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-sm text-stone-200">
                  <option value="text_to_stencil">Prompt → éles stencil</option>
                  <option value="text_to_image">Prompt → AI kép</option>
                </select>
              </div>
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
              <div className="mt-5 grid gap-3">
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-stone-500">Kép feldolgozás</span>
                  <select value={imageMode} onChange={function (e) { setImageMode(e.target.value); }}
                    className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-sm text-stone-200">
                    <option value="image_to_image_stencil">AI kép → kép → éles stencil</option>
                    <option value="image_to_stencil">Kép → közvetlen éles stencil</option>
                    <option value="image_to_image">AI kép → kép</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-stone-500">Kiegészítő prompt</span>
                  <input value={imagePrompt} onChange={function (e) { setImagePrompt(e.target.value); }}
                    placeholder="pl. preserve subject, clean tattoo linework"
                    className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-sm text-stone-200 outline-none focus:border-amber-600" />
                </label>
              </div>
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
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-stone-500">Szélesség</span>
                  <div className="mt-1 flex items-center gap-2">
                    <input type="number" min="20" max="700" step="0.1" value={widthMm}
                      onChange={function (e) { setTargetWidth(e.target.value); }}
                      className="w-full rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-sm text-stone-200" />
                    <span className="text-xs text-stone-500">mm</span>
                  </div>
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-stone-500">Magasság</span>
                  <div className="mt-1 flex items-center gap-2">
                    <input type="number" min="20" max="1000" step="0.1" value={heightMm}
                      onChange={function (e) { setTargetHeight(e.target.value); }}
                      className="w-full rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-sm text-stone-200" />
                    <span className="text-xs text-stone-500">mm</span>
                  </div>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={setBackPreset}
                  className="rounded-lg border border-amber-800/60 bg-amber-500/10 px-3 py-2 text-xs text-amber-300 hover:border-amber-600">
                  Teljes hát: 450 × 600 mm
                </button>
                <label className="flex items-center gap-2 text-xs text-stone-400">
                  <input type="checkbox" checked={lockAspect}
                    onChange={function (e) { setLockAspect(e.target.checked); }}
                  />
                  Aránytartás
                </label>
              </div>

              {widthMm > 190 || heightMm > 277 ? (
                <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-xs text-amber-300">
                  Nagy minta: A4 lapokra darabolás, illesztési átfedés és regisztrációs keresztek automatikusan.
                </div>
              ) : null}

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
              {result.generatedUrl && result.isStencil !== false && (
                <details className="mt-4 rounded-lg border border-stone-800 bg-stone-950/50 px-4 py-3">
                  <summary className="cursor-pointer text-xs text-stone-400">AI kép előnézete (kép → kép)</summary>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={result.generatedUrl} alt="" className="mx-auto mt-3 block max-h-[320px] w-auto rounded-lg" />
                </details>
              )}

              {result.isStencil !== false && (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label="Méret" value={p.widthMm + ' × ' + p.heightMm + ' mm'} gold />
                <Stat label="A4 lapok" value={a4Layout ? a4Layout.pageCount + ' (' + a4Layout.cols + '×' + a4Layout.rows + ')' : '—'} />
                <Stat label="Raszter" value={p.px} />
                <Stat label="px / mm" value={String(p.pxPerMm)} />
                <Stat label="Fedettseg" value={r.coverage + '%'} />
                <Stat label="Hidak" value={String(r.bridges)} />
                <Stat label="Kulon darab" value={String(r.islands)} tone={r.islands > 1 ? 'warn' : 'ok'} />
              </div>
              )}

              {result.isStencil !== false && (
              <div className={'mt-4 rounded-lg border px-4 py-3 text-sm ' + (qualityTone === 'ok' ? 'border-emerald-900/60 bg-emerald-950/30 text-emerald-300' : qualityTone === 'warn' ? 'border-amber-900/60 bg-amber-950/30 text-amber-300' : 'border-red-900/60 bg-red-950/30 text-red-300')}>
                <div className="font-semibold">Minoseg: {r.quality}</div>
                <div className="mt-1 text-xs opacity-90">{r.verdictText || ''}</div>
              </div>
              )}

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

              {result.isStencil !== false ? (
                <>
                  <button
                    onClick={async function () {
                      try { await downloadExactStencilPng(); }
                      catch (e) { setError(e && e.message ? e.message : 'PNG export hiba'); }
                    }}
                    className="btn3d mt-5 w-full !py-3.5">Teljes méretű stencil PNG</button>
                  <button
                    onClick={async function () {
                      try { await downloadA4Package(); }
                      catch (e) { setError(e && e.message ? e.message : 'A4 export hiba'); }
                    }}
                    className="btn3d mt-3 w-full !py-3.5 !bg-amber-500/10">PRO A4 nyomtatási csomag (ZIP)</button>
                  <p className="mt-3 text-xs leading-relaxed text-stone-500">
                    A4 lapokon illesztési vonalak, kis keresztek és oldalszám. Nyomtatás 100% / Actual size, Fit to page kikapcsolva.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-4 rounded-lg border border-stone-800 bg-stone-950/50 px-4 py-3 text-sm text-stone-300">
                    Ez egy közvetlen AI kép. A stencil mód helyett a generált képet kaptad vissza.
                  </p>
                  <a href={result.url} download={'inkforge-' + (title || 'ai-kep') + '.png'}
                    className="btn3d mt-5 block w-full !py-3.5 text-center">AI kép letöltése</a>
                </>
              )}
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
