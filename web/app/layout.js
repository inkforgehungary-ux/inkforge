export const metadata = {
  title: 'InkForge - Tattoo Stencil Platform | B2B',
  description: 'Raktar nelkuli B2B stencil platform tetovalostudioknak.',
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
