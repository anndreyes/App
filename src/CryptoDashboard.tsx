import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { Activity, Brain, LineChart, RefreshCw, Wallet, WifiOff } from 'lucide-react';
import type { CoinMarket, PricePoint, Timeframe } from './lib/types';
import { fetchHistory, fetchMarkets } from './lib/api';
import { forecast as runForecast, type ModelId } from './lib/predict';
import { changeColor, fmtCompact, fmtPct, fmtPrice } from './lib/format';
import { usePersistentState } from './lib/usePersistentState';
import { Watchlist } from './components/Watchlist';
import { PriceChart } from './components/PriceChart';
import { StudyPanel } from './components/StudyPanel';
import { PredictionPanel } from './components/PredictionPanel';
import { PaperTrading } from './components/PaperTrading';

const DEFAULT_WATCHLIST = ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple', 'cardano', 'dogecoin', 'chainlink'];

const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: '1', label: '24H' },
  { id: '7', label: '7D' },
  { id: '30', label: '30D' },
  { id: '90', label: '90D' },
  { id: '365', label: '1Y' },
];

const REFRESH_MS = 60_000;

function Card({ title, icon, children, className }: { title: string; icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={clsx('min-w-0 rounded-xl border border-slate-800 bg-slate-900/60 p-4', className)}>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function CryptoDashboard() {
  const [watchlist, setWatchlist] = usePersistentState<string[]>('crypto.watchlist', DEFAULT_WATCHLIST);
  const [selected, setSelected] = usePersistentState<string>('crypto.selected', 'bitcoin');
  const [days, setDays] = usePersistentState<Timeframe>('crypto.timeframe', '30');
  const [model, setModel] = usePersistentState<ModelId>('crypto.model', 'ensemble');
  const [horizon, setHorizon] = useState(24);

  const [markets, setMarkets] = useState<CoinMarket[]>([]);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [marketsDemo, setMarketsDemo] = useState(false);
  const [historyDemo, setHistoryDemo] = useState(false);
  const demo = marketsDemo || historyDemo;
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const loadMarkets = useCallback(async () => {
    const res = await fetchMarkets(watchlist);
    setMarkets(res.data);
    setMarketsDemo(res.demo);
    setUpdatedAt(Date.now());
  }, [watchlist]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const res = await fetchHistory(selected, days);
    setHistory(res.data);
    setHistoryDemo(res.demo);
    setLoading(false);
  }, [selected, days]);

  useEffect(() => {
    loadMarkets();
    const t = setInterval(loadMarkets, REFRESH_MS);
    return () => clearInterval(t);
  }, [loadMarkets]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Keep the selection valid if the selected coin is removed.
  useEffect(() => {
    if (!watchlist.includes(selected) && watchlist.length) setSelected(watchlist[0]);
  }, [watchlist, selected, setSelected]);

  const coin = markets.find((m) => m.id === selected);

  // Splice the latest market price onto the history so charts stay current between history refreshes.
  const series = useMemo(() => {
    if (!coin || !history.length) return history;
    const lastPoint = history[history.length - 1];
    if (Date.now() - lastPoint.t < 60_000) return history;
    return [...history, { t: Date.now(), price: coin.price, volume: lastPoint.volume }];
  }, [history, coin]);

  const stepMs = useMemo(() => {
    if (series.length < 3) return 3_600_000;
    const diffs = series.slice(1).map((p, i) => p.t - series[i].t).sort((a, b) => a - b);
    return diffs[Math.floor(diffs.length / 2)];
  }, [series]);

  const maxHorizon = Math.max(2, Math.min(120, Math.floor(series.length / 4)));
  const h = Math.min(horizon, maxHorizon);

  const forecast = useMemo(
    () => (series.length >= 60 ? runForecast(series.map((p) => p.price), h, model) : null),
    [series, h, model],
  );

  const currentPrice = coin?.price ?? series[series.length - 1]?.price ?? 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1500px] px-4 py-5">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">
              <Activity className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Crypto Trading Dashboard</h1>
              <p className="text-xs text-slate-500">Track · Study · Predict</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {demo && (
              <span
                className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 font-medium text-amber-300"
                title="CoinGecko could not be reached (offline or rate limited). Showing simulated prices."
              >
                <WifiOff className="h-3.5 w-3.5" /> Demo data
              </span>
            )}
            {updatedAt && <span>Updated {new Date(updatedAt).toLocaleTimeString()}</span>}
            <button
              onClick={() => {
                loadMarkets();
                loadHistory();
              }}
              className="rounded-lg border border-slate-800 p-2 hover:bg-slate-800"
              title="Refresh"
            >
              <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
            </button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Watchlist
            markets={markets}
            watchlist={watchlist}
            selected={selected}
            onSelect={setSelected}
            onAdd={(id) => {
              setWatchlist((w) => (w.includes(id) ? w : [...w, id]));
              setSelected(id);
            }}
            onRemove={(id) => setWatchlist((w) => w.filter((x) => x !== id))}
          />

          <main className="min-w-0 space-y-4">
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    {coin?.image && <img src={coin.image} alt="" className="h-6 w-6 rounded-full" />}
                    <h2 className="text-lg font-semibold">{coin?.name ?? selected}</h2>
                    <span className="text-sm text-slate-500">{coin?.symbol}</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-3">
                    <span className="text-3xl font-bold tabular-nums">{fmtPrice(currentPrice)}</span>
                    <span className={clsx('text-sm font-medium tabular-nums', changeColor(coin?.change24h))}>{fmtPct(coin?.change24h)} 24h</span>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
                  {[
                    ['1h', <span className={changeColor(coin?.change1h)}>{fmtPct(coin?.change1h)}</span>],
                    ['7d', <span className={changeColor(coin?.change7d)}>{fmtPct(coin?.change7d)}</span>],
                    ['Market cap', fmtCompact(coin?.marketCap)],
                    ['24h volume', fmtCompact(coin?.volume24h)],
                    ['24h high', fmtPrice(coin?.high24h)],
                    ['24h low', fmtPrice(coin?.low24h)],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between gap-3">
                      <dt className="text-slate-500">{k}</dt>
                      <dd className="tabular-nums text-slate-200">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="mb-3 flex gap-1">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.id}
                    onClick={() => setDays(tf.id)}
                    className={clsx(
                      'rounded-md px-3 py-1 text-xs font-semibold',
                      days === tf.id ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-slate-800',
                    )}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
              {series.length > 1 ? (
                <PriceChart history={series} days={days} forecast={forecast} stepMs={stepMs} />
              ) : (
                <div className="flex h-80 items-center justify-center text-sm text-slate-500">Loading chart…</div>
              )}
            </section>

            {series.length > 1 && (
              <div className="grid gap-4 xl:grid-cols-2">
                <Card title="Study" icon={<LineChart className="h-4 w-4" />}>
                  <StudyPanel history={series} stepMs={stepMs} markets={markets} />
                </Card>
                <div className="min-w-0 space-y-4">
                  <Card title="Predict" icon={<Brain className="h-4 w-4" />}>
                    <PredictionPanel
                      forecast={forecast}
                      model={model}
                      onModel={setModel}
                      horizon={h}
                      onHorizon={setHorizon}
                      maxHorizon={maxHorizon}
                      stepMs={stepMs}
                      currentPrice={currentPrice}
                    />
                  </Card>
                  <Card title="Paper trading" icon={<Wallet className="h-4 w-4" />}>
                    <PaperTrading coin={coin} markets={markets} />
                  </Card>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
