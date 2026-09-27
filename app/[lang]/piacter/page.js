const CATS = [
  ['machines','Gépek'],['needles','Tűk'],['inks','Festékek'],['paper','Stencilpapír'],
  ['stencil','Stencil-kiegészítők'],['hygiene','Higiénia'],['furniture','Bútor'],['aftercare','Utánkezelés']
];

async function getProducts() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const r = await fetch(url + '/rest/v1/products?select=*,distributors(name,website),product_categories(slug,name_hu)&is_active=eq.true&order=is_featured.desc,created_at.desc', {
      headers: { apikey:key, Authorization:'Bearer '+key }, next:{ revalidate:60 }
    });
    return r.ok ? await r.json() : [];
  } catch (_) { return []; }
}

export default async function MarketPage({ params }) {
  const lang = (params && params.lang) || 'hu';
  const hu = lang === 'hu';
  const products = await getProducts();
  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <a href={'/' + lang} className="text-sm text-stone-500 hover:text-amber-400">← {hu ? 'Vissza' : 'Back'}</a>
      <section className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-500">INKFORGE B2B MARKETPLACE</p>
        <h1 className="mt-3 text-4xl font-bold text-white">{hu ? 'Tetováló kellékek egy helyen' : 'Tattoo supplies in one place'}</h1>
        <p className="mt-3 max-w-3xl text-stone-400">{hu ? 'Gépek, tűk, festékek, stencilpapír és egyéb kellékek közvetlenül a partner-forgalmazóktól. Az InkForge nem tart készletet.' : 'Machines, needles, inks, stencil paper and supplies fulfilled directly by partner distributors. InkForge holds no inventory.'}</p>
      </section>

      <div className="mt-8 flex flex-wrap gap-2">
        {CATS.map((c) => <a key={c[0]} href={'#'+c[0]} className="rounded-full border border-stone-700 px-3 py-2 text-sm text-stone-300 hover:border-amber-500 hover:text-amber-300">{hu ? c[1] : c[0]}</a>)}
      </div>

      {products.length ? (
        <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <article key={p.id} className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-900/50">
              {p.image_path ? <img src={p.image_path} alt={p.name} className="aspect-square w-full object-cover" /> : <div className="flex aspect-square items-center justify-center bg-stone-950 text-xs text-stone-600">INKFORGE B2B</div>}
              <div className="p-5">
                <div className="text-xs text-amber-500">{p.brand || p.distributors?.name || 'Partner'}</div>
                <h2 className="mt-1 font-semibold text-white">{p.name}</h2>
                {p.price != null && <div className="mt-3 text-lg font-bold text-amber-400">{Number(p.price).toLocaleString('hu-HU')} {p.currency || 'HUF'}</div>}
                <div className="mt-3 text-xs text-stone-500">{hu ? 'A rendelést a forgalmazó teljesíti.' : 'Order fulfilled by the distributor.'}</div>
                {p.partner_checkout_url || p.external_url ? <a href={p.partner_checkout_url || p.external_url} target="_blank" rel="noreferrer" className="mt-4 block rounded-lg bg-amber-500 px-4 py-2.5 text-center text-sm font-semibold text-stone-950">{hu ? 'Megnézem / rendelés' : 'View / order'}</a> : <span className="mt-4 block text-xs text-stone-600">{hu ? 'Partneri link hamarosan' : 'Partner link coming soon'}</span>}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="mt-10 rounded-2xl border border-stone-800 bg-stone-900/40 p-10 text-center">
          <h2 className="text-xl font-semibold text-white">{hu ? 'A partnerkatalógus épül' : 'Partner catalogue is being built'}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-stone-500">{hu ? 'A forgalmazók közvetlenül töltik fel a kínálatukat. A készletet, csomagolást és szállítást ők kezelik; az InkForge nem tart raktárt.' : 'Distributors add their catalogue directly. They handle stock, packing and shipping; InkForge holds no inventory.'}</p>
          <a href={'/' + lang + '/forgalmazoknak'} className="mt-5 inline-block rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-stone-950">{hu ? 'Forgalmazóként jelentkezem' : 'Join as a distributor'}</a>
        </section>
      )}

      <section className="mt-12 rounded-2xl border border-stone-800 bg-stone-950/50 p-6">
        <h2 className="text-lg font-semibold text-white">{hu ? 'Raktár nélküli működés' : 'Inventory-free model'}</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">{hu ? 'Az InkForge csak a platformot és a forgalmat adja. A partner felel a termékért, árért, készletért, szállításért és ügyfélszolgálatért.' : 'InkForge provides the platform and traffic. The partner is responsible for the product, price, stock, shipping and customer service.'}</p>
      </section>
    </main>
  );
}