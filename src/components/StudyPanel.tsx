import { useMemo } from 'react';
import clsx from 'clsx';
import type { CoinMarket, PricePoint } from '../lib/types';
import { computeStats, correlation, logReturns, technicalSignals, type SignalBias } from '../lib/indicators';
import { fmtPrice } from '../lib/format';

const BIAS_STYLE: Record<SignalBias, string> = {
  bullish: 'bg-emerald-500/15 text-emerald-300',
  bearish: 'bg-rose-500/15 text-rose-300',
  neutral: 'bg-slate-500/15 text-slate-300',
};

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div className="rounded-lg bg-slate-950/60 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={clsx('mt-0.5 text-sm font-semibold tabular-nums', tone === 'up' ? 'text-emerald-400' : tone === 'down' ? 'text-rose-400' : 'text-slate-100')}>
        {value}
      </div>
    </div>
  );
}

interface Props {
  history: PricePoint[];
  stepMs: number;
  markets: CoinMarket[];
}

export function StudyPanel({ history, stepMs, markets }: Props) {
  const prices = useMemo(() => history.map((p) => p.price), [history]);
  const stats = useMemo(() => computeStats(prices, (365 * 86_400_000) / stepMs), [prices, stepMs]);
  const signals = useMemo(() => technicalSignals(prices), [prices]);

  const score = signals.reduce((s, x) => s + (x.bias === 'bullish' ? 1 : x.bias === 'bearish' ? -1 : 0), 0);
  const verdict: SignalBias = score >= 2 ? 'bullish' : score <= -2 ? 'bearish' : 'neutral';

  // Correlations from the 7-day hourly sparklines the market call already returns.
  const corr = useMemo(() => {
    const coins = markets.filter((m) => m.sparkline.length > 24).slice(0, 8);
    const rets = coins.map((m) => logReturns(m.sparkline));
    return { coins, matrix: rets.map((a) => rets.map((b) => correlation(a, b))) };
  }, [markets]);

  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-300">Statistics for this period</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Period return" value={pct(stats.periodReturn)} tone={stats.periodReturn >= 0 ? 'up' : 'down'} />
          <Stat label="Annualised volatility" value={pct(stats.annualVol)} />
          <Stat label="Sharpe (annualised)" value={stats.sharpe.toFixed(2)} tone={stats.sharpe >= 0 ? 'up' : 'down'} />
          <Stat label="Max drawdown" value={pct(stats.maxDrawdown)} tone="down" />
          <Stat label="Period high" value={fmtPrice(stats.high)} />
          <Stat label="Period low" value={fmtPrice(stats.low)} />
          <Stat label="Support (P10)" value={fmtPrice(stats.support)} />
          <Stat label="Resistance (P90)" value={fmtPrice(stats.resistance)} />
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">Technical signals</h3>
          <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize', BIAS_STYLE[verdict])}>
            Overall: {verdict} ({score > 0 ? '+' : ''}
            {score})
          </span>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-800">
              {signals.map((s) => (
                <tr key={s.name}>
                  <td className="px-3 py-2 text-slate-300">{s.name}</td>
                  <td className="px-3 py-2 tabular-nums text-slate-100">{s.value}</td>
                  <td className="hidden px-3 py-2 text-slate-500 sm:table-cell">{s.note}</td>
                  <td className="px-3 py-2 text-right">
                    <span className={clsx('rounded px-2 py-0.5 text-xs capitalize', BIAS_STYLE[s.bias])}>{s.bias}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {corr.coins.length > 1 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-300">7-day return correlation (watchlist)</h3>
          <div className="overflow-x-auto">
            <table className="text-xs tabular-nums">
              <thead>
                <tr>
                  <th />
                  {corr.coins.map((c) => (
                    <th key={c.id} className="px-2 py-1 font-medium text-slate-400">
                      {c.symbol}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {corr.coins.map((row, i) => (
                  <tr key={row.id}>
                    <th className="px-2 py-1 text-left font-medium text-slate-400">{row.symbol}</th>
                    {corr.matrix[i].map((v, j) => (
                      <td
                        key={j}
                        className="px-2 py-1 text-center text-slate-100"
                        style={{ background: v >= 0 ? `rgba(16,185,129,${v * 0.55})` : `rgba(244,63,94,${-v * 0.55})` }}
                      >
                        {v.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
