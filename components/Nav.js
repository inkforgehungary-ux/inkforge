export default function Nav({ lang, t }) {
  const items = [['stencil', t('nav.stencil')],['arak', lang === 'hu' ? 'Árak' : 'Pricing'],['piacter', t('nav.marketplace')],['studiok', t('nav.studios')],['muveszek', t('nav.artists')],['forgalmazoknak', t('nav.distributors')],['kapcsolat', t('nav.contact')]];
  const designlyItems = [
    ['poster', 'Plakát'],
    ['business-card', 'Névjegy'],
    ['flyer', 'Szórólap'],
    ['menu', 'Étlap / Menü'],
    ['social-post', 'Social poszt'],
    ['logo', 'Logo / Arculat'],
    ['merch', 'Merch / Póló'],
    ['streamer', 'Streamer / Gamer'],
    ['vector', 'Vektor fájl'],
    ['web-design', 'Prémium webdesign'],
    ['ai-editor', 'AI Editor'],
    ['templates', 'Sablonok'],
    ['projects', 'Projektek'],
  ];
  return <nav className="sticky top-0 z-40 border-b border-stone-800 bg-stone-950/95 backdrop-blur">
    <div className="mx-auto flex max-w-6xl items-center gap-2 px-6 py-3">
      <a href={'/' + lang} aria-label="InkForge home"><img src="/inkforge-logo.png" alt="InkForge" className="h-8 w-auto" /></a>
      <div className="ms-auto hidden items-center gap-1 lg:flex">
        {items.map((it)=><a key={it[0]} href={'/' + lang + '/' + it[0]} className="rounded-lg px-3 py-2 text-sm text-stone-300 hover:bg-stone-800 hover:text-amber-400">{it[1]}</a>)}
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/20">
            Designly Studio ▾
          </summary>
          <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-stone-700 bg-stone-950 p-2 shadow-2xl">
            <a href={'/' + lang + '/designly'} className="mb-1 block rounded-xl bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/20">Designly Studio — Összes</a>
            <div className="grid grid-cols-2 gap-1">
              {designlyItems.map((it)=><a key={it[0]} href={'/' + lang + '/designly?tool=' + it[0]} className="rounded-lg px-3 py-2 text-xs text-stone-300 hover:bg-stone-800 hover:text-white">{it[1]}</a>)}
            </div>
          </div>
        </details>
      </div>
      <div className="ms-auto flex items-center gap-2 lg:ms-2"><a href={'/' + lang + '/belepes'} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-stone-950 hover:bg-amber-400">{t('nav.login')}</a><LangSwitch current={lang} /></div>
    </div>
  </nav>;
}
function LangSwitch({ current }) {
  const codes=['hu','en','de','fr','es','it','pt','nl','pl','cs','sk','ro','tr','ru','ja','ko','zh','th','ar','he'];
  return <span className="rounded-lg border border-stone-700 px-3 py-1.5 text-xs">{codes.map((c,i)=><a key={c} href={'/' + c} aria-current={c===current?'page':undefined} className={c===current?'text-amber-400':'text-stone-500'}>{i>0?' ':''}{c.toUpperCase()}</a>)}</span>;
}
