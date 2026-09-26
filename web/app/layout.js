export const metadata = {
  title: 'InkForge – Tattoo Stencil',
  description: 'Az ötletedből tiszta sablon. Feltöltött képből nyomtatásra kész tattoo stencil.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}
