export const metadata = {
  title: 'InkForge – Tattoo Stencil Platform | B2B',
  description:
    'Raktar nelkuli B2B platform: stencil generalas, piacter es bemutatkozo profilok tetovalostudioknak es muveszeknek.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

// A gyoker layout csak a HTML-keretet adja.
// A nyelvi layout ([lang]/layout.js) adja a <html> attributumokat,
// de a Next.js 14-ben a gyoker layoutnak is tartalmaznia kell a html/body elemet.
export default function RootLayout({ children }) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}
