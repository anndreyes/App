import { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PricePoint } from '../lib/types';
import type { Forecast } from '../lib/predict';
import { bollinger, ema, macd, rsi, sma } from '../lib/indicators';
import { fmtCompact, fmtPrice, fmtTime } from '../lib/format';

const MAX_POINTS = 500;

type Overlay = 'sma20' | 'sma50' | 'ema20' | 'bb' | 'forecast';
type Lower = 'volume' | 'rsi' | 'macd';

const OVERLAYS: { id: Overlay; label: string; color: string }[] = [
  { id: 'sma20', label: 'SMA 20', color: '#f59e0b' },
  { id: 'sma50', label: 'SMA 50', color: '#ec4899' },
  { id: 'ema20', label: 'EMA 20', color: '#22d3ee' },
  { id: 'bb', label: 'Bollinger', color: '#a78bfa' },
  { id: 'forecast', label: 'Forecast', color: '#34d399' },
];

interface Row {
  t: number;
  price?: number;
  volume?: number;
  sma20?: number;
  sma50?: number;
  ema20?: number;
  bb?: [number, number];
  rsi?: number;
  macd?: number;
  signal?: number;
  hist?: number;
  forecast?: number;
  band?: [number, number];
}

const nn = (v: number | null) => (v == null ? undefined : v);

interface Props {
  history: PricePoint[];
  days: string;
  forecast: Forecast | null;
  stepMs: number;
}

export function PriceChart({ history, days, forecast, stepMs }: Props) {
  const [overlays, setOverlays] = useState<Set<Overlay>>(new Set(['sma20', 'forecast']));
  const [lower, setLower] = useState<Lower>('volume');

  const rows = useMemo(() => {
    const prices = history.map((p) => p.price);
    const s20 = sma(prices, 20);
    const s50 = sma(prices, 50);
    const e20 = ema(prices, 20);
    const bb = bollinger(prices);
    const r = rsi(prices);
    const m = macd(prices);
    const all: Row[] = history.map((p, i) => ({
      t: p.t,
      price: p.price,
      volume: p.volume,
      sma20: nn(s20[i]),
      sma50: nn(s50[i]),
      ema20: nn(e20[i]),
      bb: bb.upper[i] != null ? [bb.lower[i]!, bb.upper[i]!] : undefined,
      rsi: nn(r[i]),
      macd: nn(m.line[i]),
      signal: nn(m.signal[i]),
      hist: nn(m.hist[i]),
    }));
    // Downsample for rendering; indicators were computed on the full series.
    const every = Math.ceil(all.length / MAX_POINTS);
    const out = all.filter((_, i) => i % every === 0 || i === all.length - 1);
    if (forecast && out.length) {
      const lastRow = out[out.length - 1];
      lastRow.forecast = lastRow.price;
      lastRow.band = [lastRow.price!, lastRow.price!];
      const lastT = lastRow.t;
      for (const f of forecast.points) {
        out.push({ t: lastT + f.step * stepMs, forecast: f.price, band: [f.lower, f.upper] });
      }
    }
    return out;
  }, [history, forecast, stepMs]);

  const toggle = (o: Overlay) =>
    setOverlays((prev) => {
      const next = new Set(prev);
      if (next.has(o)) next.delete(o);
      else next.add(o);
      return next;
    });

  const show = (o: Overlay) => overlays.has(o);
  const xProps = {
    dataKey: 't',
    type: 'number' as const,
    scale: 'time' as const,
    domain: ['dataMin', 'dataMax'] as [string, string],
    tickFormatter: (t: number) => fmtTime(t, days),
    stroke: '#64748b',
    fontSize: 11,
    minTickGap: 40,
  };
  const tooltipStyle = {
    contentStyle: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 },
    labelFormatter: (t: number) => new Date(t).toLocaleString(),
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {OVERLAYS.map((o) => (
          <button
            key={o.id}
            onClick={() => toggle(o.id)}
            className={clsx(
              'flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors',
              show(o.id) ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-slate-800 text-slate-500 hover:text-slate-300',
            )}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: o.color, opacity: show(o.id) ? 1 : 0.4 }} />
            {o.label}
          </button>
        ))}
      </div>

      <div className="h-80">
        <ResponsiveContainer>
          <ComposedChart data={rows} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1e293b" vertical={false} />
            <XAxis {...xProps} />
            <YAxis
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => fmtPrice(v)}
              stroke="#64748b"
              fontSize={11}
              width={80}
              orientation="right"
            />
            <Tooltip
              {...tooltipStyle}
              formatter={(v: number | [number, number], name: string) =>
                Array.isArray(v) ? [`${fmtPrice(v[0])} – ${fmtPrice(v[1])}`, name] : [fmtPrice(v), name]
              }
            />
            {show('bb') && <Area dataKey="bb" name="Bollinger" stroke="#a78bfa" strokeOpacity={0.5} fill="#a78bfa" fillOpacity={0.08} isAnimationActive={false} />}
            {show('forecast') && forecast && (
              <Area dataKey="band" name="95% range" stroke="none" fill="#34d399" fillOpacity={0.12} isAnimationActive={false} />
            )}
            <Area dataKey="price" name="Price" stroke="#818cf8" strokeWidth={2} fill="url(#priceFill)" dot={false} isAnimationActive={false} />
            {show('sma20') && <Line dataKey="sma20" name="SMA 20" stroke="#f59e0b" dot={false} strokeWidth={1.3} isAnimationActive={false} />}
            {show('sma50') && <Line dataKey="sma50" name="SMA 50" stroke="#ec4899" dot={false} strokeWidth={1.3} isAnimationActive={false} />}
            {show('ema20') && <Line dataKey="ema20" name="EMA 20" stroke="#22d3ee" dot={false} strokeWidth={1.3} isAnimationActive={false} />}
            {show('forecast') && forecast && (
              <Line dataKey="forecast" name="Forecast" stroke="#34d399" strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-1">
        {(['volume', 'rsi', 'macd'] as Lower[]).map((l) => (
          <button
            key={l}
            onClick={() => setLower(l)}
            className={clsx(
              'rounded-md px-2.5 py-1 text-xs font-medium uppercase',
              lower === l ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300',
            )}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="h-32">
        <ResponsiveContainer>
          <ComposedChart data={rows} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#1e293b" vertical={false} />
            <XAxis {...xProps} hide />
            {lower === 'volume' && (
              <>
                <YAxis tickFormatter={fmtCompact} stroke="#64748b" fontSize={11} width={80} orientation="right" />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [fmtCompact(v), 'Volume']} />
                <Bar dataKey="volume" fill="#475569" isAnimationActive={false} />
              </>
            )}
            {lower === 'rsi' && (
              <>
                <YAxis domain={[0, 100]} ticks={[30, 50, 70]} stroke="#64748b" fontSize={11} width={80} orientation="right" />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [v.toFixed(1), 'RSI']} />
                <ReferenceLine y={70} stroke="#f43f5e" strokeDasharray="3 3" />
                <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" />
                <Line dataKey="rsi" stroke="#eab308" dot={false} strokeWidth={1.5} isAnimationActive={false} />
              </>
            )}
            {lower === 'macd' && (
              <>
                <YAxis stroke="#64748b" fontSize={11} width={80} orientation="right" tickFormatter={(v: number) => Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(v)} />
                <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [v.toPrecision(4), name]} />
                <ReferenceLine y={0} stroke="#475569" />
                <Bar dataKey="hist" name="Histogram" isAnimationActive={false}>
                  {rows.map((r, i) => (
                    <Cell key={i} fill={(r.hist ?? 0) >= 0 ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
                <Line dataKey="macd" name="MACD" stroke="#38bdf8" dot={false} strokeWidth={1.3} isAnimationActive={false} />
                <Line dataKey="signal" name="Signal" stroke="#f97316" dot={false} strokeWidth={1.3} isAnimationActive={false} />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
