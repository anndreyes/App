export function fmtPrice(v: number | null | undefined) {
  if (v == null || !isFinite(v)) return '—';
  const digits = v >= 1000 ? 2 : v >= 1 ? 3 : v >= 0.01 ? 4 : 8;
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: Math.min(2, digits), maximumFractionDigits: digits });
}

export function fmtCompact(v: number | null | undefined) {
  if (v == null || !isFinite(v)) return '—';
  return '$' + Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(v);
}

export function fmtPct(v: number | null | undefined, digits = 2) {
  if (v == null || !isFinite(v)) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(digits)}%`;
}

export function changeColor(v: number | null | undefined) {
  if (v == null || v === 0) return 'text-slate-400';
  return v > 0 ? 'text-emerald-400' : 'text-rose-400';
}

export function fmtTime(t: number, days: string) {
  const d = new Date(t);
  if (days === '1') return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (Number(days) <= 30) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

export function fmtDuration(ms: number) {
  const h = ms / 3_600_000;
  if (h < 1) return `${Math.round(ms / 60_000)} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} days`;
}
