// INKFORGE — MENTES ES KULDES: kliens oldali hid
// A stencil mentese es e-mailben kuldese a szerver vegpontokon at.

export async function saveStencil(payload) {
  try {
    const res = await fetch('/api/stencil/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

export async function sendStencil(payload) {
  try {
    const res = await fetch('/api/stencil/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

export function bytesToBase64(bytes) {
  let bin = '';
  const CH = 8192;
  for (let i = 0; i < bytes.length; i += CH) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + CH, bytes.length)));
  }
  return btoa(bin);
}
