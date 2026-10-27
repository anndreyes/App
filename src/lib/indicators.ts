// Technical indicators. Every function returns an array aligned with its
// input, using null where there is not yet enough history.

export type Series = (number | null)[];

export function sma(values: number[], period: number): Series {
  const out: Series = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): Series {
  const out: Series = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function bollinger(values: number[], period = 20, mult = 2) {
  const mid = sma(values, period);
  const upper: Series = new Array(values.length).fill(null);
  const lower: Series = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    const m = mid[i]!;
    let v = 0;
    for (let j = i - period + 1; j <= i; j++) v += (values[j] - m) ** 2;
    const sd = Math.sqrt(v / period);
    upper[i] = m + mult * sd;
    lower[i] = m - mult * sd;
  }
  return { mid, upper, lower };
}

// Wilder's RSI
export function rsi(values: number[], period = 14): Series {
  const out: Series = new Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

export function macd(values: number[], fast = 12, slow = 26, signalPeriod = 9) {
  const f = ema(values, fast);
  const s = ema(values, slow);
  const line: Series = values.map((_, i) => (f[i] != null && s[i] != null ? f[i]! - s[i]! : null));
  const start = line.findIndex((v) => v != null);
  const signal: Series = new Array(values.length).fill(null);
  if (start >= 0) {
    const sig = ema(line.slice(start) as number[], signalPeriod);
    sig.forEach((v, i) => (signal[start + i] = v));
  }
  const hist: Series = line.map((v, i) => (v != null && signal[i] != null ? v - signal[i]! : null));
  return { line, signal, hist };
}

export function last(series: Series): number | null {
  for (let i = series.length - 1; i >= 0; i--) if (series[i] != null) return series[i];
  return null;
}

// ---- Statistics ----

export function logReturns(values: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < values.length; i++) out.push(Math.log(values[i] / values[i - 1]));
  return out;
}

export function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function stdev(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

export function correlation(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  const x = a.slice(-n);
  const y = b.slice(-n);
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}

export function maxDrawdown(values: number[]) {
  let peak = values[0] ?? 0;
  let worst = 0;
  for (const v of values) {
    peak = Math.max(peak, v);
    worst = Math.min(worst, v / peak - 1);
  }
  return worst;
}

export interface Stats {
  periodReturn: number;
  annualVol: number;
  sharpe: number;
  maxDrawdown: number;
  high: number;
  low: number;
  support: number;
  resistance: number;
}

/** @param periodsPerYear number of samples per year (8760 for hourly, 365 for daily) */
export function computeStats(values: number[], periodsPerYear: number): Stats {
  const r = logReturns(values);
  const vol = stdev(r) * Math.sqrt(periodsPerYear);
  const annualReturn = mean(r) * periodsPerYear;
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  return {
    periodReturn: values[values.length - 1] / values[0] - 1,
    annualVol: vol,
    sharpe: vol ? annualReturn / vol : 0,
    maxDrawdown: maxDrawdown(values),
    high: sorted[sorted.length - 1],
    low: sorted[0],
    // Simple support / resistance: 10th / 90th percentile of the window.
    support: q(0.1),
    resistance: q(0.9),
  };
}

export type SignalBias = 'bullish' | 'bearish' | 'neutral';

export interface Signal {
  name: string;
  value: string;
  bias: SignalBias;
  note: string;
}

export function technicalSignals(values: number[]): Signal[] {
  const price = values[values.length - 1];
  const out: Signal[] = [];

  const r = last(rsi(values));
  if (r != null) {
    out.push({
      name: 'RSI (14)',
      value: r.toFixed(1),
      bias: r < 30 ? 'bullish' : r > 70 ? 'bearish' : 'neutral',
      note: r < 30 ? 'Oversold' : r > 70 ? 'Overbought' : 'In normal range',
    });
  }

  const m = macd(values);
  const h = last(m.hist);
  if (h != null) {
    out.push({
      name: 'MACD (12,26,9)',
      value: h.toPrecision(3),
      bias: h > 0 ? 'bullish' : 'bearish',
      note: h > 0 ? 'MACD above signal line' : 'MACD below signal line',
    });
  }

  const s20 = last(sma(values, 20));
  const s50 = last(sma(values, 50));
  if (s20 != null && s50 != null) {
    out.push({
      name: 'SMA 20 / 50',
      value: s20 > s50 ? 'Golden' : 'Death',
      bias: s20 > s50 ? 'bullish' : 'bearish',
      note: s20 > s50 ? 'Short-term average above long-term' : 'Short-term average below long-term',
    });
  }
  if (s50 != null) {
    out.push({
      name: 'Price vs SMA 50',
      value: `${(((price - s50) / s50) * 100).toFixed(2)}%`,
      bias: price > s50 ? 'bullish' : 'bearish',
      note: price > s50 ? 'Trading above trend' : 'Trading below trend',
    });
  }

  const bb = bollinger(values);
  const up = last(bb.upper);
  const lo = last(bb.lower);
  if (up != null && lo != null) {
    const pctB = (price - lo) / (up - lo || 1);
    out.push({
      name: 'Bollinger %B',
      value: pctB.toFixed(2),
      bias: pctB < 0.05 ? 'bullish' : pctB > 0.95 ? 'bearish' : 'neutral',
      note: pctB < 0.05 ? 'At lower band' : pctB > 0.95 ? 'At upper band' : 'Inside bands',
    });
  }
  return out;
}
