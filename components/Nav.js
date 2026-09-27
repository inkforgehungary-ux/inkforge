export default function Nav({ lang, t }) {
  const items = [
    ['stencil', t.navStencil],
    ['piacter', t.navMarket],
    ['studiok', t.navStudios],
    ['muveszek', t.navArtists],
    ['forgalmazoknak', t.navDist],
    ['kapcsolat', t.navContact],
  ];
  return (
    <nav className="sticky top-0 z-40 border-b border-stone-800 bg-stone-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-6 py-3">
        <a href={'/' + lang}><img src="/inkforge-logo.png" alt="InkForge" className="h-8 w-auto" /></a>
        <div className="ms-auto hidden items-center gap-1 lg:flex">
          {items.map(function (it) {
            return <a key={it[0]} href={'/' + lang + '/' + it[0]} className="rounded-lg px-3 py-2 text-sm text-stone-300 hover:bg-stone-800 hover:text-amber-400">{it[1]}</a>;
          })}
        </div>
        <div className="ms-auto flex items-center gap-2 lg:ms-2">
          <a href={'/' + lang + '/belepes'} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-stone-950 hover:bg-amber-400">{t.navLogin}</a>
          <LangSwitch current={lang} />
        </div>
      </div>
    </nav>
  );
}

function LangSwitch({ current }) {
  const codes = ['hu','en','de','fr','es','it','pt','nl','pl','cs','sk','ro','tr','ru','ja','ko','zh','th','ar','he'];
  return (
    <span className="rounded-lg border border-stone-700 px-3 py-1.5 text-xs">
      {codes.map(function (c, i) {
        return <a key={c} href={'/' + c} className={c === current ? 'text-amber-400' : 'text-stone-500'}>{i > 0 ? ' ' : ''}{c.toUpperCase()}</a>;
      })}
    </span>
  );
}
