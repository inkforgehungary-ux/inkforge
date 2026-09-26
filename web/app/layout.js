export const metadata = {
  title: 'InkForge – Tattoo Stencil Platform | B2B',
  description:
    'Raktar nelkuli B2B stencil generalas tetovalostudioknak. Feltoltott kepbol nyomtatasra kesz sablon, pontos mm-merettel — a feldolgozas a bongeszoben fut.',
  icons: { icon: '/api/static/favicon.png' },
  openGraph: {
    title: 'InkForge – Tattoo Stencil Platform',
    description:
      'Raktar nelkuli B2B stencil generalas tetovalostudioknak. Feltoltott kepbol nyomtatasra kesz sablon.',
    images: [{ url: '/api/static/inkforge-opengraph.png', width: 1200, height: 630, alt: 'InkForge' }],
    type: 'website',
    locale: 'hu_HU',
  },
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
