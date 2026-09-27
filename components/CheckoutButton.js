'use client';

import { useState } from 'react';

export default function CheckoutButton({ lang, checkoutKey, children, className }) {
  const [busy, setBusy] = useState(false);
  async function start() {
    setBusy(true);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: checkoutKey }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || 'Checkout hiba');
      window.location.href = data.url;
    } catch (e) {
      alert(e.message || 'Checkout hiba');
      setBusy(false);
    }
  }
  return <button type="button" disabled={busy} onClick={start} className={className}>{busy ? (lang === 'hu' ? 'Megnyitás...' : 'Opening...') : children}</button>;
}
