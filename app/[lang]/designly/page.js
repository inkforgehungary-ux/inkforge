const TOOLS = [
  ['poster','Plakát','Poszterek és kampányanyagok'],
  ['business-card','Névjegy','Üzleti névjegy és kontaktkártya'],
  ['flyer','Szórólap','Szórólapok és promóciós anyagok'],
  ['menu','Étlap / Menü','Étlapok, itallapok és árlisták'],
  ['social-post','Social poszt','Instagram, Facebook és social kreatívok'],
  ['logo','Logo / Arculat','Logó, brand és vizuális arculat'],
  ['merch','Merch / Póló','Póló, ruha és merchandise grafikák'],
  ['streamer','Streamer / Gamer','Streamer, gamer és esports kreatívok'],
  ['vector','Vektor fájl','Nyomtatható és szerkeszthető vektoros anyagok'],
  ['web-design','Prémium webdesign','Landing page és prémium weboldal design'],
  ['ai-editor','AI Editor','AI-alapú szerkesztés és finomítás'],
  ['templates','Sablonok','Újrahasználható prémium sablonok'],
  ['projects','Projektek','Saját tervek, mentések és munkafolyamatok'],
];

export default function DesignlyPage({ params, searchParams }) {
  const lang = (params && params.lang) || 'hu';
  const selected = searchParams && searchParams.tool;
  const selectedTool = TOOLS.find(x => x[0] === selected);
  return (
    <main lang={lang} className="min-h-screen bg-stone-950 text-stone-100">
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">InkForge · Designly Studio</div>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">Minden kreatív eszköz egy helyen</h1>
          <p className="mt-4 max-w-3xl text-stone-400">A Designly Studio menübe összegyűjtöttük a korábban meghatározott tervezési kategóriákat: nyomtatott anyagok, social kreatívok, arculat, merch, vektor, webdesign és AI szerkesztés.</p>
        </div>
        {selectedTool && (
          <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <div className="text-xs uppercase tracking-wider text-amber-400">Kiválasztva</div>
            <h2 className="mt-1 text-2xl font-semibold">{selectedTool[1]}</h2>
            <p className="mt-1 text-stone-400">{selectedTool[2]}</p>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {TOOLS.map(([id,title,desc]) => (
            <a key={id} href={'/' + lang + '/designly?tool=' + id} className="group rounded-2xl border border-stone-800 bg-stone-900/70 p-5 transition hover:border-amber-500/50 hover:bg-stone-900">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{title}</h2>
                <span className="text-amber-400 opacity-70 group-hover:opacity-100">→</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-stone-400">{desc}</p>
            </a>
          ))}
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-stone-800 p-5"><b>AI Editor</b><p className="mt-2 text-sm text-stone-400">Szerkesztés, finomítás és variációk egy munkafolyamatban.</p></div>
          <div className="rounded-2xl border border-stone-800 p-5"><b>Sablonok + Projektek</b><p className="mt-2 text-sm text-stone-400">Mentett munkák és újrahasználható designok egy helyen.</p></div>
          <div className="rounded-2xl border border-stone-800 p-5"><b>Credit rendszer</b><p className="mt-2 text-sm text-stone-400">A korábban meghatározott ingyenes preview → jóváhagyás → kreditlevonás logikára előkészítve.</p></div>
        </div>
      </section>
    </main>
  );
}
