import { getDictionary, makeT } from '../../lib/i18n/config';
import LocaleShell from '../../../components/LocaleShell';

export function generateMetadata({ params }) {
  const t = makeT(getDictionary(params.lang));
  return { title: t('contact.title') + ' - InkForge' };
}

export default function ContactPage({ params }) {
  const lang = params.lang;
  const t = makeT(getDictionary(lang));
  return (
    <LocaleShell lang={lang} t={t}>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">{t('contact.title')}</h1>
        <p className="mt-2 text-sm text-stone-400">{t('contact.intro')}</p>
        <p className="mt-8 rounded-xl border border-stone-800 bg-stone-900/40 px-5 py-6 text-sm text-stone-300">
          inkforge.hungary@gmail.com
        </p>
      </main>
    </LocaleShell>
  );
}
