import clsx from 'clsx';
import { AlertTriangle } from 'lucide-react';
import { MODEL_LABELS, type Forecast, type ModelId } from '../lib/predict';
import { fmtDuration, fmtPrice } from '../lib/format';

interface Props {
  forecast: Forecast | null;
  model: ModelId;
  onModel: (m: ModelId) => void;
  horizon: number;
  onHorizon: (h: number) => void;
  maxHorizon: number;
  stepMs: number;
  currentPrice: number;
}

export function PredictionPanel({ forecast, model, onModel, horizon, onHorizon, maxHorizon, stepMs, currentPrice }: Props) {
  const bt = forecast?.backtest;
  const beatsNaive = bt && isFinite(bt.mape) && bt.mape < bt.naiveMape;
  const final = forecast?.points[forecast.points.length - 1];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Model</span>
          <select
            value={model}
            onChange={(e) => onModel(e.target.value as ModelId)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
          >
            {(Object.keys(MODEL_LABELS) as ModelId[]).map((m) => (
              <option key={m} value={m}>
                {MODEL_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 flex justify-between text-xs text-slate-500">
            <span>Horizon</span>
            <span className="text-slate-300">
              {horizon} steps ≈ {fmtDuration(horizon * stepMs)}
            </span>
          </span>
          <input
            type="range"
            min={1}
            max={maxHorizon}
            value={horizon}
            onChange={(e) => onHorizon(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </label>
      </div>

      {forecast && final && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg bg-slate-950/60 p-3">
              <div className="text-xs text-slate-500">Predicted price</div>
              <div className="text-sm font-semibold tabular-nums text-slate-100">{fmtPrice(final.price)}</div>
            </div>
            <div className="rounded-lg bg-slate-950/60 p-3">
              <div className="text-xs text-slate-500">Expected change</div>
              <div className={clsx('text-sm font-semibold tabular-nums', forecast.expectedChange >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                {forecast.expectedChange >= 0 ? '+' : ''}
                {(forecast.expectedChange * 100).toFixed(2)}%
              </div>
            </div>
            <div className="rounded-lg bg-slate-950/60 p-3">
              <div className="text-xs text-slate-500">95% range</div>
              <div className="text-sm font-semibold tabular-nums text-slate-100">
                {fmtPrice(final.lower)} – {fmtPrice(final.upper)}
              </div>
            </div>
            <div className="rounded-lg bg-slate-950/60 p-3">
              <div className="text-xs text-slate-500">Chance of ending higher</div>
              <div className="text-sm font-semibold tabular-nums text-slate-100">{(forecast.probUp * 100).toFixed(0)}%</div>
            </div>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-rose-500/40">
            <div className="h-full bg-emerald-500/80" style={{ width: `${forecast.probUp * 100}%` }} />
          </div>

          {bt && bt.origins > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-300">Backtest ({bt.origins} walk-forward tests)</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-slate-950/60 p-3">
                  <div className="text-xs text-slate-500">Model error (MAPE)</div>
                  <div className="text-sm font-semibold tabular-nums text-slate-100">{(bt.mape * 100).toFixed(2)}%</div>
                </div>
                <div className="rounded-lg bg-slate-950/60 p-3">
                  <div className="text-xs text-slate-500">"No change" error</div>
                  <div className="text-sm font-semibold tabular-nums text-slate-100">{(bt.naiveMape * 100).toFixed(2)}%</div>
                </div>
                <div className="rounded-lg bg-slate-950/60 p-3">
                  <div className="text-xs text-slate-500">Direction correct</div>
                  <div className="text-sm font-semibold tabular-nums text-slate-100">{(bt.directionAccuracy * 100).toFixed(0)}%</div>
                </div>
              </div>
              <p className={clsx('mt-2 text-xs', beatsNaive ? 'text-emerald-400' : 'text-amber-400')}>
                {beatsNaive
                  ? 'On this window the model beat a "price stays the same" guess.'
                  : 'On this window the model did not beat a "price stays the same" guess, so treat its forecast with extra caution.'}
              </p>
            </section>
          )}
        </>
      )}

      <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200/90">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          These are statistical extrapolations of past prices (current: {fmtPrice(currentPrice)}), for study only. Crypto
          prices are driven by news and sentiment that no model here sees. This is not financial advice.
        </p>
      </div>
    </div>
  );
}
