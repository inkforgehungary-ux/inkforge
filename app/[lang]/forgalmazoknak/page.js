const CATEGORIES = ['Stencilpapír','Stencil-kiegészítők','Tattoo gépek','Tűk / cartridge-ek','Festékek','Higiéniai termékek','Utánkezelés'];

export default function DistributorsPage({ params }) {
  const lang = (params && params.lang) || 'hu';
  const hu = lang === 'hu';
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <a href={'/' + lang} className="text-sm text-stone-500 hover:text-amber-400">← {hu ? 'Vissza' : 'Back'}</a>
      <section className="mt-8 max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-500">INKFORGE B2B</p>
        <h1 className="mt-3 text-4xl font-bold text-white">{hu ? 'Forgalmazz nálunk raktár nélkül' : 'Sell through InkForge without holding stock'}</h1>
        <p className="mt-4 text-stone-400 leading-relaxed">{hu ? 'Te tartod a készletet, te csomagolsz és te szállítasz. Az InkForge a célközönséget, a katalógust és a forgalmat adja. Nincs saját raktárunk és nincs készletkockázatunk.' : 'You keep stock, pack and ship. InkForge provides the audience, catalogue and traffic. We hold no inventory.'}</p>
      </section>
      <section className="mt-10 grid gap-5 md:grid-cols-3">
        {[
          [hu ? 'Nincs saját raktár' : 'No warehouse', hu ? 'Nincs készletvásárlás, polcbérlet vagy saját logisztika.' : 'No stock purchasing, warehouse or in-house logistics.'],
          [hu ? 'Te teljesíted' : 'You fulfil', hu ? 'A partner kezeli a készletet, csomagolást, szállítást és visszárut.' : 'The partner handles stock, packing, shipping and returns.'],
          [hu ? 'B2B célközönség' : 'B2B audience', hu ? 'Tetoválók és stúdiók látják a termékeidet a stencil-platform mellett.' : 'Tattoo artists and studios discover your products alongside the stencil platform.'],
        ].map((x) => <div key={x[0]} className="rounded-2xl border border-stone-800 bg-stone-900/40 p-6"><h2 className="font-semibold text-amber-400">{x[0]}</h2><p className="mt-2 text-sm leading-relaxed text-stone-400">{x[1]}</p></div>)}
      </section>
      <section className="mt-12 rounded-2xl border border-stone-800 bg-stone-950/60 p-6">
        <h2 className="text-xl font-semibold text-white">{hu ? 'Kiemelt kategóriák' : 'Featured categories'}</h2>
        <div className="mt-5 flex flex-wrap gap-2">{CATEGORIES.map((x) => <span key={x} className="rounded-full border border-stone-700 px-3 py-2 text-sm text-stone-300">{x}</span>)}</div>
      </section>
      <section className="mt-10 rounded-2xl border border-amber-700/40 bg-amber-950/10 p-6">
        <h2 className="text-xl font-semibold text-white">{hu ? 'Jelentkezés forgalmazóként' : 'Apply as a distributor'}</h2>
        <form action="/api/distributors/apply" method="post" className="mt-5 grid gap-4 sm:grid-cols-2">
          <input name="companyName" required placeholder={hu ? 'Cégnév' : 'Company name'} className="rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 text-sm text-white" />
          <input name="contactName" required placeholder={hu ? 'Kapcsolattartó' : 'Contact name'} className="rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 text-sm text-white" />
          <input name="email" required type="email" placeholder="E-mail" className="rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 text-sm text-white" />
          <input name="website" placeholder="Weboldal" className="rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 text-sm text-white" />
          <select name="fulfillmentMode" className="rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 text-sm text-white"><option value="dropship">Dropship – te teljesíted</option><option value="external">Külső webshopra irányítás</option><option value="affiliate">Partneri / affiliate</option></select>
          <input name="categories" placeholder={hu ? 'Kategóriák, vesszővel' : 'Categories, comma separated'} className="rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 text-sm text-white" />
          <textarea name="message" rows="4" placeholder={hu ? 'Rövid bemutatkozás' : 'Short introduction'} className="sm:col-span-2 rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 text-sm text-white" />
          <button className="sm:col-span-2 rounded-lg bg-amber-500 px-5 py-3 font-semibold text-stone-950 hover:bg-amber-400">{hu ? 'Jelentkezés elküldése' : 'Submit application'}</button>
        </form>
      </section>
    </main>
  );
}