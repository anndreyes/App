// Statistical forecasting models. All models work on log prices so that
// errors scale with price and forecasts can never go negative.
import { logReturns, mean, stdev } from './indicators';

export type ModelId = 'linear' | 'holt' | 'ar' | 'ensemble';

export const MODEL_LABELS: Record<ModelId, string> = {
  linear: 'Linear trend',
  holt: "Holt's smoothing",
  ar: 'Autoregressive AR(5)',
  ensemble: 'Ensemble (average)',
};

type Forecaster = (logPrices: number[], horizon: number) => number[];

// Ordinary least squares line through the last `window` points, extrapolated.
const linearTrend: Forecaster = (lp, horizon) => {
  const window = Math.min(lp.length, Math.max(30, Math.floor(lp.length / 2)));
  const y = lp.slice(-window);
  const n = y.length;
  const mx = (n - 1) / 2;
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (i - mx) * (y[i] - my);
    sxx += (i - mx) ** 2;
  }
  const slope = sxx ? sxy / sxx : 0;
  // Anchor at the last observation so the forecast starts where price is now.
  const lastY = y[n - 1];
  return Array.from({ length: horizon }, (_, h) => lastY + slope * (h + 1));
};

function holtFit(y: number[], alpha: number, beta: number) {
  let level = y[0];
  let trend = y[1] - y[0];
  let sse = 0;
  for (let i = 1; i < y.length; i++) {
    const pred = level + trend;
    sse += (y[i] - pred) ** 2;
    const prevLevel = level;
    level = alpha * y[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }
  return { level, trend, sse };
}

// Holt's linear (double exponential) smoothing with a damped trend; alpha and
// beta are chosen by grid search on one-step-ahead squared error.
const holt: Forecaster = (lp, horizon) => {
  let best = holtFit(lp, 0.5, 0.1);
  for (const a of [0.1, 0.2, 0.3, 0.5, 0.7, 0.9]) {
    for (const b of [0.01, 0.05, 0.1, 0.2, 0.3]) {
      const fit = holtFit(lp, a, b);
      if (fit.sse < best.sse) best = fit;
    }
  }
  const phi = 0.98;
  const out: number[] = [];
  let damp = 0;
  for (let h = 1; h <= horizon; h++) {
    damp += phi ** h;
    out.push(best.level + damp * best.trend);
  }
  return out;
};

// Solve A x = b with Gaussian elimination and partial pivoting.
function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const piv = M[c][c] || 1e-12;
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / piv;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / (M[r][r] || 1e-12);
  }
  return x;
}

// AR(p) on log returns, fitted by ridge-regularised least squares and
// iterated forward.
const autoregressive: Forecaster = (lp, horizon) => {
  const p = 5;
  const r = logReturns(lp.map(Math.exp));
  if (r.length < p * 4) return linearTrend(lp, horizon);
  const dim = p + 1; // intercept + lags
  const XtX = Array.from({ length: dim }, () => new Array(dim).fill(0));
  const Xty = new Array(dim).fill(0);
  for (let t = p; t < r.length; t++) {
    const x = [1, ...Array.from({ length: p }, (_, k) => r[t - 1 - k])];
    for (let i = 0; i < dim; i++) {
      Xty[i] += x[i] * r[t];
      for (let j = 0; j < dim; j++) XtX[i][j] += x[i] * x[j];
    }
  }
  const lambda = 1e-6 * r.length;
  for (let i = 1; i < dim; i++) XtX[i][i] += lambda;
  const coef = solve(XtX, Xty);

  const hist = r.slice(-p);
  let level = lp[lp.length - 1];
  const out: number[] = [];
  for (let h = 0; h < horizon; h++) {
    let next = coef[0];
    for (let k = 0; k < p; k++) next += coef[k + 1] * hist[hist.length - 1 - k];
    hist.push(next);
    level += next;
    out.push(level);
  }
  return out;
};

const FORECASTERS: Record<Exclude<ModelId, 'ensemble'>, Forecaster> = {
  linear: linearTrend,
  holt,
  ar: autoregressive,
};

function runModel(model: ModelId, lp: number[], horizon: number): number[] {
  if (model !== 'ensemble') return FORECASTERS[model](lp, horizon);
  const all = Object.values(FORECASTERS).map((f) => f(lp, horizon));
  return Array.from({ length: horizon }, (_, h) => mean(all.map((f) => f[h])));
}

export interface ForecastPoint {
  step: number;
  price: number;
  lower: number;
  upper: number;
}

export interface Backtest {
  mape: number; // mean absolute % error at the final horizon step
  naiveMape: number; // same for "price stays where it is"
  directionAccuracy: number; // share of origins where up/down call was right
  origins: number;
}

export interface Forecast {
  model: ModelId;
  points: ForecastPoint[];
  expectedChange: number; // fraction, last forecast vs current price
  probUp: number; // rough probability the price ends higher, from the band
  backtest: Backtest;
}

// Standard normal CDF (Abramowitz-Stegun approximation)
function normCdf(z: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

// Walk-forward test: refit at several past origins and compare the forecast
// `horizon` steps out with what actually happened.
function backtest(model: ModelId, lp: number[], horizon: number): Backtest {
  const origins = 8;
  const minTrain = Math.max(40, Math.floor(lp.length * 0.5));
  const span = lp.length - horizon - minTrain;
  if (span <= 0) return { mape: NaN, naiveMape: NaN, directionAccuracy: NaN, origins: 0 };
  let err = 0;
  let naiveErr = 0;
  let hits = 0;
  let count = 0;
  for (let k = 0; k < origins; k++) {
    const end = minTrain + Math.floor((span * k) / Math.max(1, origins - 1));
    const train = lp.slice(0, end);
    const actual = Math.exp(lp[end + horizon - 1]);
    const start = Math.exp(train[train.length - 1]);
    const pred = Math.exp(runModel(model, train, horizon)[horizon - 1]);
    err += Math.abs(pred - actual) / actual;
    naiveErr += Math.abs(start - actual) / actual;
    if (Math.sign(pred - start) === Math.sign(actual - start)) hits++;
    count++;
  }
  return { mape: err / count, naiveMape: naiveErr / count, directionAccuracy: hits / count, origins: count };
}

export function forecast(prices: number[], horizon: number, model: ModelId): Forecast {
  const lp = prices.map(Math.log);
  const path = runModel(model, lp, horizon);
  // Uncertainty grows like a random walk: sigma * sqrt(h).
  const sigma = stdev(logReturns(prices));
  const points = path.map((v, i) => {
    const band = 1.96 * sigma * Math.sqrt(i + 1);
    return { step: i + 1, price: Math.exp(v), lower: Math.exp(v - band), upper: Math.exp(v + band) };
  });
  const current = prices[prices.length - 1];
  const finalLog = path[path.length - 1];
  const finalSigma = sigma * Math.sqrt(horizon) || 1e-9;
  return {
    model,
    points,
    expectedChange: Math.exp(finalLog) / current - 1,
    probUp: normCdf((finalLog - Math.log(current)) / finalSigma),
    backtest: backtest(model, lp, horizon),
  };
}
