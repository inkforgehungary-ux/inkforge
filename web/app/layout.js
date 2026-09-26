export const metadata = {
  title: 'InkForge – Tattoo Stencil Platform | B2B',
  description:
    'Raktar nelkuli B2B platform: stencil generalas, piacter es bemutatkozo profilok tetovalostudioknak es muveszeknek.',
  icons: { icon: '/api/static/favicon.png' },
  openGraph: {
    title: 'InkForge – Tattoo Stencil Platform',
    description:
      'Stencil generalas, piacter es bemutatkozo profilok — B2B, raktar nelkul.',
    images: [{ url: '/api/static/inkforge-opengraph.png', width: 1200, height: 630, alt: 'InkForge' }],
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return children;
}
