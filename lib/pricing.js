export const ONE_OFF_GENERATIONS = [
  { id: 'gen_1', generations: 1, priceHuf: 500, label: '1 generálás' },
  { id: 'gen_5', generations: 5, priceHuf: 2500, label: '5 generálás' },
  { id: 'gen_10', generations: 10, priceHuf: 5000, label: '10 generálás' },
  { id: 'gen_25', generations: 25, priceHuf: 12500, label: '25 generálás' },
];

export const SUBSCRIPTION_PLANS = [
  { id: 'start', name: 'START', priceHuf: 4990, generations: 15, priceIdEnv: 'STRIPE_PRICE_START', highlight: false },
  { id: 'pro', name: 'PRO', priceHuf: 9990, generations: 40, priceIdEnv: 'STRIPE_PRICE_PRO', highlight: true },
  { id: 'studio', name: 'STUDIO', priceHuf: 19990, generations: 100, priceIdEnv: 'STRIPE_PRICE_STUDIO', highlight: false },
  { id: 'pro_studio', name: 'PRO STUDIO', priceHuf: 34990, generations: 200, priceIdEnv: 'STRIPE_PRICE_PRO_STUDIO', highlight: false },
  { id: 'business', name: 'BUSINESS', priceHuf: 59990, generations: 400, priceIdEnv: 'STRIPE_PRICE_BUSINESS', highlight: false },
];

export const PREMIUM_MULTIPLIERS = {
  standard: 1,
  pro: 2,
  ultra: 3,
};

export function getPriceForPlan(id) {
  return SUBSCRIPTION_PLANS.find((p) => p.id === id) || null;
}
