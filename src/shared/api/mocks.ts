import type { Product, Stylist, TimeSlot } from '../types/domain';

const img = (seed: string, w = 800, h = 1000) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

const brand = (id: string, label: string, tone: 'dark' | 'light' = 'dark') => ({
  id,
  label,
  vendor_id: `v_${id}`,
  tone,
});

const products: Product[] = [
  {
    id: 'p1',
    vendor_id: 'v_atelier',
    title: 'Wool Overcoat',
    price_minor: 42000,
    currency: 'USD',
    images: [img('coat1'), img('coat2'), img('coat3')],
    brand_tag: brand('atelier', 'Atelier Nord'),
    status: 'in_stock',
    sizes: [
      { size: 'S', stock: 4 },
      { size: 'M', stock: 6 },
      { size: 'L', stock: 2 },
      { size: 'XL', stock: 1 },
    ],
  },
  {
    id: 'p2',
    vendor_id: 'v_maison',
    title: 'Silk Shirt',
    price_minor: 18500,
    currency: 'USD',
    images: [img('shirt1'), img('shirt2')],
    brand_tag: brand('maison', 'Maison Onyx', 'light'),
    status: 'low_stock',
    sizes: [
      { size: 'S', stock: 0 },
      { size: 'M', stock: 2 },
      { size: 'L', stock: 1 },
    ],
  },
  {
    id: 'p3',
    vendor_id: 'v_atelier',
    title: 'Tailored Trouser',
    price_minor: 21000,
    currency: 'USD',
    images: [img('trouser1'), img('trouser2'), img('trouser3')],
    brand_tag: brand('atelier', 'Atelier Nord'),
    status: 'in_stock',
    sizes: [
      { size: '30', stock: 5 },
      { size: '32', stock: 7 },
      { size: '34', stock: 3 },
    ],
  },
  {
    id: 'p4',
    vendor_id: 'v_kuro',
    title: 'Leather Derby',
    price_minor: 29500,
    currency: 'USD',
    images: [img('shoe1'), img('shoe2')],
    brand_tag: brand('kuro', 'Kuro Studio'),
    status: 'out_of_stock',
    sizes: [
      { size: '41', stock: 0 },
      { size: '42', stock: 0 },
      { size: '43', stock: 0 },
    ],
  },
];

/** Builds a day of half-hour slots starting at 09:00 local, relative to today. */
function slots(prefix: string, price: number, taken: number[], held: number[]): TimeSlot[] {
  const base = new Date();
  base.setHours(9, 0, 0, 0);
  return Array.from({ length: 8 }, (_, i) => {
    const d = new Date(base.getTime() + i * 45 * 60_000);
    return {
      id: `${prefix}-${i}`,
      starts_at: d.toISOString(),
      duration_min: 45,
      price_minor: price,
      currency: 'USD',
      status: taken.includes(i) ? 'taken' : held.includes(i) ? 'held' : 'available',
    };
  });
}

const stylists: Stylist[] = [
  {
    id: 's1',
    vendor_id: 'v_blade',
    name: 'Amara Okoye',
    role: 'Master Barber',
    avatar_url: img('amara', 200, 200),
    rating: 4.9,
    slots: slots('s1', 3500, [0, 1, 4], [2]),
  },
  {
    id: 's2',
    vendor_id: 'v_blade',
    name: 'Daniel Mwakyusa',
    role: 'Fade Specialist',
    avatar_url: img('daniel', 200, 200),
    rating: 4.8,
    slots: slots('s2', 3000, [], [5]),
  },
  {
    id: 's3',
    vendor_id: 'v_sable',
    name: 'Zawadi Hassan',
    role: 'Colour & Styling',
    avatar_url: img('zawadi', 200, 200),
    rating: 5.0,
    slots: slots('s3', 6500, [0, 1, 2, 3, 4, 5, 6, 7], []),
  },
];

const routes: Record<string, unknown> = {
  '/v1/boutique/products': products,
  '/v1/lounge/stylists': stylists,
};

/** Simulates network latency so skeleton loaders are visible in development. */
export async function mockRoute<T>(path: string): Promise<T> {
  await new Promise((r) => setTimeout(r, 1100));
  const data = routes[path];
  if (!data) throw new Error(`No mock for ${path}`);
  return data as T;
}
