export const metadata = {
  title: 'InkForge – Tattoo Stencil Platform | B2B',
  description:
    'Raktar nelkuli B2B platform: stencil generalas, piacter es bemutatkozo profilok tetovalostudioknak es muveszeknek.',
  icons: {
    icon: '/favicon.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}
