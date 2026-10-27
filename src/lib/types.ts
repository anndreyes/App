export interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change1h: number | null;
  change24h: number | null;
  change7d: number | null;
  marketCap: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  sparkline: number[];
}

export interface PricePoint {
  t: number; // ms timestamp
  price: number;
  volume: number;
}

export interface CoinSearchResult {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
}

export type Timeframe = '1' | '7' | '30' | '90' | '365';

export interface Holding {
  coinId: string;
  symbol: string;
  amount: number;
  avgCost: number;
}

export interface Trade {
  id: string;
  t: number;
  coinId: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
}
