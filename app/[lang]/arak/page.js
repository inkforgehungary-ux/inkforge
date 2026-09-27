import { ONE_OFF_GENERATIONS, SUBSCRIPTION_PLANS } from '../../../lib/pricing';
import CheckoutButton from '../../../components/CheckoutButton';

export default function PricingPage({ params }) {
  const lang = (params && params.lang) || 'hu';
  const hu = lang === 'hu';

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <a href={'/' + lang} className="text-sm text-stone-500 hover:text-amber-400">← {hu ? 'Vissza' : 'Back'}</a>

      <section className="mt-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-500">INKFORGE</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">{hu ? 'Egyszeri generálás vagy havi csomag' : 'Pay per generation or monthly'}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-stone-400">
          {hu ? 'Nincs ingyenes csomag. Az egyszeri használat 500 Ft/generálás, a havi csomagoknál jelentősen olcsóbb egy stencil.' : 'No free plan. One-off generations are 500 HUF; monthly plans reduce the effective price per stencil.'}
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-white">{hu ? 'Egyszeri generálások' : 'One-off generations'}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ONE_OFF_GENERATIONS.map((p) => (
            <div key={p.id} className="rounded-2xl border border-stone-800 bg-stone-900/50 p-6">
              <div className="text-sm text-stone-400">{p.label}</div>
              <div className="mt-2 text-3xl font-bold text-amber-400">{p.priceHuf.toLocaleString('hu-HU')} Ft</div>
              <div className="mt-2 text-xs text-stone-500">{hu ? 'sikeres generálás után 1–1 kreditlevonás' : 'credits are consumed only after success'}</div>
              <CheckoutButton lang={lang} checkoutKey={p.id} className="mt-5 block w-full rounded-lg bg-amber-500 px-4 py-2.5 text-center text-sm font-semibold text-stone-950 hover:bg-amber-400">{hu ? 'Vásárlás' : 'Buy'}</CheckoutButton>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">{hu ? 'Havi csomagok' : 'Monthly plans'}</h2>
            <p className="mt-1 text-sm text-stone-500">{hu ? 'A fel nem használt generálások a havi ciklus végén nem kerülnek automatikusan készpénzre váltásra.' : 'Unused monthly generations do not convert to cash.'}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {SUBSCRIPTION_PLANS.map((p) => (
            <div key={p.id} className={'rounded-2xl border p-6 ' + (p.highlight ? 'border-amber-500/70 bg-amber-950/20' : 'border-stone-800 bg-stone-900/50')}>
              {p.highlight && <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Legnépszerűbb</div>}
              <h3 className="mt-2 text-lg font-bold text-white">{p.name}</h3>
              <div className="mt-3 text-3xl font-bold text-amber-400">{p.priceHuf.toLocaleString('hu-HU')} Ft</div>
              <div className="mt-1 text-sm text-stone-400">/ hó</div>
              <div className="mt-5 border-t border-stone-800 pt-4">
                <div className="text-2xl font-semibold text-white">{p.generations}</div>
                <div className="text-xs uppercase tracking-wider text-stone-500">generálás / hó</div>
              </div>
              <div className="mt-4 text-sm text-stone-400">
                {Math.round(p.priceHuf / p.generations).toLocaleString('hu-HU')} Ft / generálás
              </div>
              <CheckoutButton lang={lang} checkoutKey={p.id} className="mt-6 block w-full rounded-lg border border-amber-600/60 px-4 py-2.5 text-center text-sm font-semibold text-amber-300 hover:bg-amber-500 hover:text-stone-950">{hu ? 'Csomag választása' : 'Choose plan'}</CheckoutButton>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 rounded-2xl border border-stone-800 bg-stone-900/40 p-6">
        <h2 className="text-lg font-semibold text-white">{hu ? 'Prémium stencil módok' : 'Premium stencil modes'}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ['STANDARD', '1×', hu ? 'éles alap stencil' : 'sharp standard stencil'],
            ['PRO', '2×', hu ? 'részletesebb vonalrajz' : 'more detailed line art'],
            ['ULTRA', '3×', hu ? 'komplex/portré, extra tisztítás' : 'complex/portrait, extra cleanup'],
          ].map((x) => (
            <div key={x[0]} className="rounded-xl border border-stone-800 p-4">
              <div className="font-semibold text-amber-400">{x[0]} · {x[1]}</div>
              <div className="mt-1 text-sm text-stone-400">{x[2]}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
