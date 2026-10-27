import { useState } from 'react';
import clsx from 'clsx';
import { RotateCcw } from 'lucide-react';
import type { CoinMarket, Holding, Trade } from '../lib/types';
import { changeColor, fmtPct, fmtPrice } from '../lib/format';
import { usePersistentState } from '../lib/usePersistentState';

export const STARTING_CASH = 10_000;

interface Portfolio {
  cash: number;
  holdings: Holding[];
  trades: Trade[];
}

const EMPTY: Portfolio = { cash: STARTING_CASH, holdings: [], trades: [] };

export function PaperTrading({ coin, markets }: { coin: CoinMarket | undefined; markets: CoinMarket[] }) {
  const [pf, setPf] = usePersistentState<Portfolio>('crypto.portfolio', EMPTY);
  const [usd, setUsd] = useState('500');
  const [error, setError] = useState('');

  const priceOf = (id: string) => markets.find((m) => m.id === id)?.price;
  const holding = coin && pf.holdings.find((h) => h.coinId === coin.id);
  const holdingsValue = pf.holdings.reduce((s, h) => s + h.amount * (priceOf(h.coinId) ?? h.avgCost), 0);
  const equity = pf.cash + holdingsValue;
  const pnl = equity - STARTING_CASH;

  function trade(side: 'buy' | 'sell') {
    setError('');
    if (!coin) return;
    const value = Number(usd);
    if (!(value > 0)) return setError('Enter an amount in USD.');
    const amount = value / coin.price;
    if (side === 'buy' && value > pf.cash + 1e-9) return setError('Not enough cash.');
    if (side === 'sell' && (!holding || amount > holding.amount + 1e-12)) return setError(`Not enough ${coin.symbol}.`);

    setPf((prev) => {
      const holdings = prev.holdings.map((h) => ({ ...h }));
      let h = holdings.find((x) => x.coinId === coin.id);
      if (side === 'buy') {
        if (!h) holdings.push((h = { coinId: coin.id, symbol: coin.symbol, amount: 0, avgCost: 0 }));
        h.avgCost = (h.avgCost * h.amount + value) / (h.amount + amount);
        h.amount += amount;
      } else if (h) {
        h.amount -= amount;
      }
      return {
        cash: prev.cash + (side === 'buy' ? -value : value),
        holdings: holdings.filter((x) => x.amount > 1e-12),
        trades: [
          { id: crypto.randomUUID(), t: Date.now(), coinId: coin.id, symbol: coin.symbol, side, amount, price: coin.price },
          ...prev.trades,
        ].slice(0, 50),
      };
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-slate-950/60 p-3">
          <div className="text-xs text-slate-500">Equity</div>
          <div className="text-sm font-semibold tabular-nums text-slate-100">{fmtPrice(equity)}</div>
        </div>
        <div className="rounded-lg bg-slate-950/60 p-3">
          <div className="text-xs text-slate-500">Cash</div>
          <div className="text-sm font-semibold tabular-nums text-slate-100">{fmtPrice(pf.cash)}</div>
        </div>
        <div className="rounded-lg bg-slate-950/60 p-3">
          <div className="text-xs text-slate-500">Total P&amp;L</div>
          <div className={clsx('text-sm font-semibold tabular-nums', changeColor(pnl))}>
            {fmtPrice(Math.abs(pnl)).replace('$', pnl < 0 ? '-$' : '$')} ({fmtPct((pnl / STARTING_CASH) * 100)})
          </div>
        </div>
      </div>

      {coin && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="block flex-1">
            <span className="mb-1 block text-xs text-slate-500">
              Amount (USD) — {coin.symbol} at {fmtPrice(coin.price)}
            </span>
            <input
              type="number"
              min={0}
              value={usd}
              onChange={(e) => setUsd(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
            />
          </label>
          <button onClick={() => trade('buy')} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
            Buy
          </button>
          <button onClick={() => trade('sell')} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500">
            Sell
          </button>
        </div>
      )}
      {error && <p className="text-xs text-rose-400">{error}</p>}

      {pf.holdings.length > 0 && (
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="py-1 text-left font-medium">Asset</th>
              <th className="py-1 text-right font-medium">Amount</th>
              <th className="py-1 text-right font-medium">Avg cost</th>
              <th className="py-1 text-right font-medium">Value</th>
              <th className="py-1 text-right font-medium">P&amp;L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 tabular-nums">
            {pf.holdings.map((h) => {
              const p = priceOf(h.coinId) ?? h.avgCost;
              const ret = (p / h.avgCost - 1) * 100;
              return (
                <tr key={h.coinId}>
                  <td className="py-1.5 text-slate-200">{h.symbol}</td>
                  <td className="py-1.5 text-right text-slate-300">{h.amount.toPrecision(6)}</td>
                  <td className="py-1.5 text-right text-slate-300">{fmtPrice(h.avgCost)}</td>
                  <td className="py-1.5 text-right text-slate-100">{fmtPrice(h.amount * p)}</td>
                  <td className={clsx('py-1.5 text-right', changeColor(ret))}>{fmtPct(ret)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {pf.trades.length > 0 && (
        <details className="text-xs text-slate-400">
          <summary className="cursor-pointer select-none text-slate-300">Trade history ({pf.trades.length})</summary>
          <ul className="mt-2 max-h-40 space-y-1 overflow-auto">
            {pf.trades.map((t) => (
              <li key={t.id} className="flex justify-between tabular-nums">
                <span>
                  <span className={t.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'}>{t.side.toUpperCase()}</span>{' '}
                  {t.amount.toPrecision(5)} {t.symbol} @ {fmtPrice(t.price)}
                </span>
                <span>{new Date(t.t).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <button
        onClick={() => confirm('Reset the paper portfolio to $10,000 cash?') && setPf(EMPTY)}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
      >
        <RotateCcw className="h-3 w-3" /> Reset portfolio
      </button>
    </div>
  );
}
