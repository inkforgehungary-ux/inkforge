export const metadata = {
  title: 'InkForge – Tattoo Stencil Platform',
  description:
    'Az otletedbol tiszta sablon. Feltoltott kepbol nyomtatasra kesz tattoo stencil, pontos mm-merettel.',
  icons: { icon: '/api/static/favicon.png' },
  openGraph: {
    title: 'InkForge – Tattoo Stencil Platform',
    description:
      'Az otletedbol tiszta sablon. Feltoltott kepbol nyomtatasra kesz tattoo stencil.',
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
