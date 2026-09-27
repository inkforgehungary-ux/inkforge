// INKFORGE — STENCIL OLDAL
// A motor bekotese a /[lang]/stencil utvonalra.

import StencilTool from '../../../components/StencilTool';

const CODES = ['hu', 'en', 'de', 'pl'];

export function generateStaticParams() {
  return CODES.map(function (lang) { return { lang: lang }; });
}

const T = {
  hu: {
    nav: 'Stencil',
    title: 'Stencil generalasa',
    intro: 'Toltsd fel a kepet, allitsd be a nyomtatasi meretet, es a motor kesziti el a sablont. A feldolgozas a bongeszodben fut — a kep nem kerul szerverre.',
    steps: ['Kep feltoltese', 'Meret es motor-ag', 'Sablon generalasa', 'Letoltes'],
    back: 'Vissza a fooldalra',
    facts: [['300 DPI', 'nyomtatasi felbontas'], ['1:1', 'mm-pontos nyomtatasi lap'], ['4 ag', 'a motor automatikusan valaszt'], ['ingyenes', 'a feldolgozas']],
    foot: 'A feldolgozas a bongeszodben fut.'
  },
  en: {
    nav: 'Stencil',
    title: 'Generate a stencil',
    intro: 'Upload the image, set the print size, and the engine builds the stencil. Processing runs in your browser — the image never reaches a server.',
    steps: ['Upload image', 'Size and engine branch', 'Generate stencil', 'Download'],
    back: 'Back to home',
    facts: [['300 DPI', 'print resolution'], ['1:1', 'mm-accurate print sheet'], ['4 branches', 'picked automatically'], ['free', 'processing']],
    foot: 'Processing runs in your browser.'
  },
  de: {
    nav: 'Stencil',
    title: 'Stencil erstellen',
    intro: 'Bild hochladen, Druckgrosse einstellen, der Motor baut die Schablone. Die Verarbeitung lauft im Browser.',
    steps: ['Bild hochladen', 'Grosse und Motor-Zweig', 'Schablone erstellen', 'Download'],
    back: 'Zuruck zur Startseite',
    facts: [['300 DPI', 'Druckauflosung'], ['1:1', 'mm-genaues Druckblatt'], ['4 Zweige', 'automatisch gewahlt'], ['kostenlos', 'die Verarbeitung']],
    foot: 'Die Verarbeitung lauft im Browser.'
  },
  pl: {
    nav: 'Szablon',
    title: 'Utworz szablon',
    intro: 'Wgraj obraz, ustaw rozmiar wydruku, a silnik zbuduje szablon. Przetwarzanie dziala w przegladarce.',
    steps: ['Wgraj obraz', 'Rozmiar i galaz silnika', 'Utworz szablon', 'Pobierz'],
    back: 'Powrot do strony glownej',
    facts: [['300 DPI', 'rozdzielczosc druku'], ['1:1', 'arkusz co do mm'], ['4 galezie', 'wybierane automatycznie'], ['bezplatnie', 'przetwarzanie']],
    foot: 'Przetwarzanie dziala w przegladarce.'
  }
};

export default function StencilPage({ params }) {
  const lang = (params && params.lang) || 'hu';
  const t = T[lang] || T.hu;

  return (
    <div lang={lang}>
      <nav className="nav-premium sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-6 py-3">
          <a href={'/' + lang} className="flex items-center gap-2">
            <img src="/inkforge-logo.png" alt="InkForge" className="h-9 w-auto" />
          </a>
          <span className="ms-3 hidden text-xs font-semibold uppercase tracking-[0.2em] text-amber-600 sm:inline">{t.nav}</span>
          <div className="ms-auto flex items-center gap-2">
            <span className="hidden items-center gap-1 rounded-lg border border-stone-800 bg-stone-950/60 px-2 py-1 text-[10px] sm:inline-flex">
              {CODES.map(function (c) {
                return (
                  <a key={c} href={'/' + c + '/stencil'} className={c === lang ? 'font-bold text-amber-400' : 'text-stone-500 hover:text-stone-300'}>
                    {c.toUpperCase()}
                  </a>
                );
              })}
            </span>
          </div>
        </div>
      </nav>

      <main className="relative z-10 min-h-screen">
        <section className="border-b border-amber-900/20 bg-gradient-to-b from-stone-950 to-[#0b0a08]">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <a href={'/' + lang} className="text-xs text-stone-500 hover:text-amber-400">&larr; {t.back}</a>
            <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              <span className="gold-text">{t.title}</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-400">{t.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {t.steps.map(function (s, i) {
                return (
                  <div key={s} className="flex items-center gap-2 rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-xs text-stone-400">
                    <span className="text-amber-700">0{i + 1}</span>{s}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-16">
          <StencilTool lang={lang} />
        </section>

        <div className="knot-rule mx-auto max-w-6xl" />

        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.facts.map(function (f) {
              return (
                <div key={f[0]} className="card3d p-5">
                  <div className="gold-text text-xl font-bold">{f[0]}</div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-stone-500">{f[1]}</div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-amber-900/25 px-6 py-10 text-xs text-stone-600">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="tracking-wide">INKFORGE &middot; STENCIL ENGINE</span>
          <span>{t.foot}</span>
        </div>
      </footer>
    </div>
  );
}
