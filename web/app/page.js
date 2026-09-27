import { getDictionary, makeT } from '../lib/i18n/config';
import Nav from '../components/Nav';

export const metadata = {
  title: 'InkForge – Tattoo Stencil Platform | B2B',
  description: 'Raktar nelkuli B2B stencil platform tetovalostudioknak.',
};

// A gyoker utvonal (/): kozvetlenul rendereljuk a magyar fooldalt.
// Igy nem fuggunk semmilyen atiranyitastol.
export default function RootPage() {
  const t = makeT(getDictionary('hu'));
  return (
    <div lang="hu">
      <Nav lang="hu" t={t} />
      <HomeBody t={t} />
      <footer className="border-t border-stone-800 px-6 py-8 text-xs text-stone-600">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <span>InkForge · Tattoo Stencil Platform · B2B</span>
          <span>{t('footer.note')}</span>
        </div>
      </footer>
    </div>
  );
}

function HomeBody({ t }) {
  return (
    <main className="min-h-screen">
      <header className="relative w-full overflow-hidden">
        <img src="/fejlec-800.png" alt="InkForge" className="w-full h-auto block" />
        <div className="absolute bottom-0 start-0 end-0 px-6 pb-6 sm:pb-10">
          <div className="mx-auto max-w-6xl">
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white drop-shadow-lg">
              {t('home.title')}
            </h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-stone-300 drop-shadow">
              {t('home.subtitle')}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href="/stencil" className="rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-stone-950 transition hover:bg-amber-400">
                {t('home.cta.stencil')}
              </a>
              <a href="/hu/piacter" className="rounded-lg border border-stone-500 px-5 py-2.5 font-semibold text-stone-200 backdrop-blur transition hover:border-amber-500 hover:text-amber-400">
                {t('home.cta.marketplace')}
              </a>
            </div>
          </div>
        </div>
      </header>
    </main>
  );
}
