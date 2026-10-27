import type { CoinMarket, CoinSearchResult, PricePoint } from './types';

// CoinGecko's public API needs no key but is rate limited (~10-30 req/min),
// so responses are cached and every call falls back to simulated data when
// the network or the rate limit gets in the way.
const BASE = 'https://api.coingecko.com/api/v3';

const cache = new Map<string, { at: number; data: unknown }>();

async function getJSON<T>(path: string, ttlMs: number): Promise<T> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data as T;
  const res = await fetch(BASE + path, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = (await res.json()) as T;
  cache.set(path, { at: Date.now(), data });
  return data;
}

export interface Fetched<T> {
  data: T;
  demo: boolean;
}

interface RawMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_percentage_1h_in_currency?: number | null;
  price_change_percentage_24h_in_currency?: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  sparkline_in_7d?: { price: number[] };
}

export async function fetchMarkets(ids: string[]): Promise<Fetched<CoinMarket[]>> {
  if (ids.length === 0) return { data: [], demo: false };
  try {
    const raw = await getJSON<RawMarket[]>(
      `/coins/markets?vs_currency=usd&ids=${encodeURIComponent(ids.join(','))}` +
        '&sparkline=true&price_change_percentage=1h,24h,7d',
      45_000,
    );
    const byId = new Map(raw.map((m) => [m.id, m]));
    const data = ids
      .map((id) => byId.get(id))
      .filter((m): m is RawMarket => !!m)
      .map((m) => ({
        id: m.id,
        symbol: m.symbol.toUpperCase(),
        name: m.name,
        image: m.image,
        price: m.current_price,
        change1h: m.price_change_percentage_1h_in_currency ?? null,
        change24h: m.price_change_percentage_24h_in_currency ?? null,
        change7d: m.price_change_percentage_7d_in_currency ?? null,
        marketCap: m.market_cap,
        volume24h: m.total_volume,
        high24h: m.high_24h,
        low24h: m.low_24h,
        sparkline: m.sparkline_in_7d?.price ?? [],
      }));
    return { data, demo: false };
  } catch {
    return { data: ids.map(demoMarket), demo: true };
  }
}

export async function fetchHistory(id: string, days: string): Promise<Fetched<PricePoint[]>> {
  try {
    const raw = await getJSON<{ prices: [number, number][]; total_volumes: [number, number][] }>(
      `/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`,
      120_000,
    );
    const data = raw.prices.map(([t, price], i) => ({
      t,
      price,
      volume: raw.total_volumes[i]?.[1] ?? 0,
    }));
    if (data.length < 10) throw new Error('not enough data');
    return { data, demo: false };
  } catch {
    return { data: demoHistory(id, Number(days)), demo: true };
  }
}

export async function searchCoins(query: string): Promise<CoinSearchResult[]> {
  if (!query.trim()) return [];
  try {
    const raw = await getJSON<{ coins: CoinSearchResult[] }>(
      `/search?query=${encodeURIComponent(query.trim())}`,
      300_000,
    );
    return raw.coins.slice(0, 8);
  } catch {
    const q = query.toLowerCase();
    return Object.entries(DEMO_COINS)
      .filter(([id, c]) => id.includes(q) || c.symbol.toLowerCase().includes(q))
      .map(([id, c]) => ({ id, name: c.name, symbol: c.symbol, thumb: '' }));
  }
}

// ---- Demo data (deterministic random walk, used when the API is unreachable) ----

const DEMO_COINS: Record<string, { name: string; symbol: string; price: number; vol: number }> = {
  bitcoin: { name: 'Bitcoin', symbol: 'BTC', price: 68000, vol: 0.03 },
  ethereum: { name: 'Ethereum', symbol: 'ETH', price: 3400, vol: 0.04 },
  solana: { name: 'Solana', symbol: 'SOL', price: 160, vol: 0.06 },
  binancecoin: { name: 'BNB', symbol: 'BNB', price: 590, vol: 0.035 },
  ripple: { name: 'XRP', symbol: 'XRP', price: 0.55, vol: 0.05 },
  cardano: { name: 'Cardano', symbol: 'ADA', price: 0.45, vol: 0.055 },
  dogecoin: { name: 'Dogecoin', symbol: 'DOGE', price: 0.14, vol: 0.07 },
  'avalanche-2': { name: 'Avalanche', symbol: 'AVAX', price: 32, vol: 0.065 },
  chainlink: { name: 'Chainlink', symbol: 'LINK', price: 15, vol: 0.06 },
  polkadot: { name: 'Polkadot', symbol: 'DOT', price: 6.5, vol: 0.06 },
};

function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

function hash(str: string) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function demoInfo(id: string) {
  return (
    DEMO_COINS[id] ?? {
      name: id.charAt(0).toUpperCase() + id.slice(1),
      symbol: id.slice(0, 4).toUpperCase(),
      price: 1 + (hash(id) % 1000) / 10,
      vol: 0.05,
    }
  );
}

// One year of hourly prices per coin, anchored to the current hour so it
// stays consistent across timeframes and refreshes.
function demoSeries(id: string): PricePoint[] {
  const info = demoInfo(id);
  const rand = seeded(hash(id));
  const hour = 3_600_000;
  const end = Math.floor(Date.now() / hour) * hour;
  const n = 365 * 24;
  const hourlyVol = info.vol / Math.sqrt(24);
  const out: PricePoint[] = [];
  let logP = 0;
  let drift = 0;
  for (let i = 0; i < n; i++) {
    // Box-Muller normal sample
    const z = Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand());
    drift = 0.995 * drift + 0.00004 * (rand() - 0.5);
    logP += drift + hourlyVol * z;
    out.push({ t: end - (n - 1 - i) * hour, price: logP, volume: 0 });
  }
  // Rescale so the latest price equals the reference price.
  const last = out[out.length - 1].price;
  for (const p of out) {
    p.price = info.price * Math.exp(p.price - last);
    p.volume = info.price * 2e6 * (0.5 + rand()) * (1 + Math.abs(p.price / info.price - 1));
  }
  return out;
}

function demoHistory(id: string, days: number): PricePoint[] {
  const all = demoSeries(id);
  const cutoff = Date.now() - days * 86_400_000;
  const slice = all.filter((p) => p.t >= cutoff);
  // Mimic CoinGecko granularity: hourly up to 90 days, daily beyond.
  return days > 90 ? slice.filter((_, i) => i % 24 === 0) : slice;
}

function demoMarket(id: string): CoinMarket {
  const info = demoInfo(id);
  const s = demoSeries(id);
  const last = s[s.length - 1].price;
  const at = (hoursAgo: number) => s[s.length - 1 - hoursAgo].price;
  const day = s.slice(-24).map((p) => p.price);
  return {
    id,
    symbol: info.symbol,
    name: info.name,
    image: '',
    price: last,
    change1h: (last / at(1) - 1) * 100,
    change24h: (last / at(24) - 1) * 100,
    change7d: (last / at(168) - 1) * 100,
    marketCap: last * 1e8,
    volume24h: s.slice(-24).reduce((a, p) => a + p.volume, 0),
    high24h: Math.max(...day),
    low24h: Math.min(...day),
    sparkline: s.slice(-168).map((p) => p.price),
  };
}
