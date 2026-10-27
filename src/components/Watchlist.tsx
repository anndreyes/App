import { useEffect, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import clsx from 'clsx';
import type { CoinMarket, CoinSearchResult } from '../lib/types';
import { searchCoins } from '../lib/api';
import { changeColor, fmtPct, fmtPrice } from '../lib/format';

export function Sparkline({ values, width = 80, height = 28 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <svg width={width} height={height} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = width / (values.length - 1);
  const d = values
    .map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)},${(height - ((v - min) / (max - min || 1)) * height).toFixed(1)}`)
    .join('');
  const up = values[values.length - 1] >= values[0];
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={d} fill="none" strokeWidth={1.5} className={up ? 'stroke-emerald-400' : 'stroke-rose-400'} />
    </svg>
  );
}

interface Props {
  markets: CoinMarket[];
  watchlist: string[];
  selected: string;
  onSelect: (id: string) => void;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}

export function Watchlist({ markets, watchlist, selected, onSelect, onAdd, onRemove }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CoinSearchResult[]>([]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      searchCoins(query).then((r) => !cancelled && setResults(r));
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const byId = new Map(markets.map((m) => [m.id, m]));

  return (
    <aside className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60">
      <div className="border-b border-slate-800 p-3">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Watchlist</h2>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Add a coin…"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-8 pr-3 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500"
          />
          {results.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    disabled={watchlist.includes(r.id)}
                    onClick={() => {
                      onAdd(r.id);
                      setQuery('');
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                  >
                    {r.thumb && <img src={r.thumb} alt="" className="h-4 w-4 rounded-full" />}
                    <span className="flex-1 truncate">{r.name}</span>
                    <span className="text-xs text-slate-500">{r.symbol.toUpperCase()}</span>
                    <Plus className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <ul className="flex-1 divide-y divide-slate-800/70 overflow-auto">
        {watchlist.map((id) => {
          const m = byId.get(id);
          return (
            <li key={id} className="group relative">
              <button
                onClick={() => onSelect(id)}
                className={clsx(
                  'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
                  selected === id ? 'bg-indigo-500/10' : 'hover:bg-slate-800/50',
                )}
              >
                {m?.image ? (
                  <img src={m.image} alt="" className="h-7 w-7 rounded-full" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-slate-200">
                    {(m?.symbol ?? id).slice(0, 3).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-100">{m?.symbol ?? id}</div>
                  <div className="truncate text-xs text-slate-500">{m?.name ?? 'Loading…'}</div>
                </div>
                <Sparkline values={m?.sparkline.filter((_, i) => i % 3 === 0) ?? []} width={60} height={24} />
                <div className="w-24 text-right">
                  <div className="text-sm tabular-nums text-slate-100">{fmtPrice(m?.price)}</div>
                  <div className={clsx('text-xs tabular-nums', changeColor(m?.change24h))}>{fmtPct(m?.change24h)}</div>
                </div>
              </button>
              {watchlist.length > 1 && (
                <button
                  onClick={() => onRemove(id)}
                  title="Remove from watchlist"
                  className="absolute right-1 top-1 hidden rounded p-0.5 text-slate-500 hover:bg-slate-700 hover:text-slate-200 group-hover:block"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
