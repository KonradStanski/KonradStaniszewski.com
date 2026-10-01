import { useId, type ReactNode } from "react";
import styles from "./MortgageRatePlanner.module.css";

export const money = (value: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(value);
export const compact = (value: number) => `${value < 0 ? "−" : ""}$${Math.abs(value) >= 1000 ? `${new Intl.NumberFormat("en-CA", { maximumFractionDigits: 1 }).format(Math.abs(value) / 1000)}k` : Math.round(Math.abs(value))}`;
export type Series = { label: string; colour: string; dash?: string; points: { x: number; y: number }[] };
export function Legend({ series }: { series: Pick<Series, "label" | "colour" | "dash">[] }) {
  return <div className={styles.legend}>{series.map(s => <span key={s.label}><svg width="26" height="10" aria-hidden="true"><line x1="0" x2="26" y1="5" y2="5" stroke={s.colour} strokeWidth="3" strokeDasharray={s.dash} /></svg>{s.label}</span>)}</div>;
}
export function Figure({ number, title, children, caption }: { number: string; title: string; children: ReactNode; caption: ReactNode }) {
  const id = useId();
  return <figure className={`${styles.figure} not-prose`} aria-labelledby={id}>
    <div className={styles.figureNumber}>Figure {number}</div><h3 id={id}>{title}</h3>
    {children}<figcaption>{caption}</figcaption>
  </figure>;
}
export function Plot({ series, label, yLabel, format = compact, xMax = 60, yMin, yMax, marker, band, xTicks, xFormat = m => m === 0 ? "Start" : `Month ${m}` }: {
  series: Series[]; label: string; yLabel: string; format?: (n: number) => string;
  xMax?: number; yMin?: number; yMax?: number; marker?: { x: number; label: string };
  band?: { from: number; to: number; label: string }; xTicks?: number[]; xFormat?: (n: number) => string;
}) {
  const values = series.flatMap(s => s.points.map(p => p.y));
  const rawLo = yMin ?? Math.min(0, ...values);
  const rawHi = yMax ?? Math.max(1, ...values) * 1.08;
  const roughStep = Math.max(0.01, (rawHi - rawLo) / 4);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const tickStep = [1, 2, 2.5, 5, 10].reduce((best, n) => Math.abs(n - roughStep / magnitude) < Math.abs(best - roughStep / magnitude) ? n : best, 1) * magnitude;
  const lo = yMin ?? Math.floor(rawLo / tickStep) * tickStep;
  const hi = yMax ?? Math.ceil(rawHi / tickStep) * tickStep;
  const yTicks = Array.from({ length: Math.max(1, Math.floor(hi / tickStep) - Math.ceil(lo / tickStep) + 1) }, (_, i) => (Math.ceil(lo / tickStep) + i) * tickStep);
  const top = 44, bottom = 244, left = 72, right = 690;
  const x = (n: number) => left + n / xMax * (right - left);
  const y = (n: number) => bottom - (n - lo) / Math.max(0.01, hi - lo) * (bottom - top);
  const ticks = xTicks ?? [0, 12, 24, 36, 48, 60].filter(n => n <= xMax);
  return <div className={styles.plotScroll} tabIndex={0} role="region" aria-label={label}>
    <svg className={styles.plot} viewBox="0 0 720 290" role="img" aria-label={label}>
      <title>{label}</title><text x={left} y="18" className={styles.axis}>{yLabel}</text>
      {band ? <g><rect x={x(band.from)} y={top} width={x(band.to) - x(band.from)} height={bottom - top} className={styles.band} /><text x={x(band.from) + 5} y="35" className={styles.axis}>{band.label}</text></g> : null}
      {yTicks.map(v => <g key={v}><line x1={left} x2={right} y1={y(v)} y2={y(v)} className={styles.grid} /><text x={left - 10} y={y(v) + 4} textAnchor="end" className={styles.axis}>{format(v)}</text></g>)}
      {lo < 0 ? <line x1={left} x2={right} y1={y(0)} y2={y(0)} className={styles.zero} /> : null}
      {marker ? <g><line x1={x(marker.x)} x2={x(marker.x)} y1={top} y2={bottom} className={styles.marker} /><text x={x(marker.x) - 5} y="35" textAnchor="end" className={styles.axis}>{marker.label}</text></g> : null}
      {series.map(s => <path key={s.label} d={s.points.map((p, i) => `${i ? "L" : "M"}${x(p.x).toFixed(2)},${y(p.y).toFixed(2)}`).join(" ")} fill="none" stroke={s.colour} strokeWidth="2.8" strokeDasharray={s.dash} />)}
      {ticks.map(v => <text key={v} x={x(v)} y={bottom + 27} textAnchor="middle" className={styles.axis}>{xFormat(v)}</text>)}
    </svg>
  </div>;
}
export function CostBars({ rows }: { rows: { label: string; path: string; delta: number }[] }) {
  return <div className={styles.costBars} role="img" aria-label="Five-year variable interest savings or additional cost compared with fixed">
    <div className={styles.barGuide}><span>Variable costs less</span><span>Variable costs more</span></div>
    {rows.map(r => <div key={r.label} className={styles.costRow}>
      <div className={styles.costLabel}><strong>{r.label}</strong><small>{r.path}</small></div>
      <div className={styles.barTrack}><span className={styles.barZero} /><span className={styles.bar} style={{ left: r.delta < 0 ? `${50 + r.delta / 900}%` : "50%", width: `${Math.abs(r.delta) / 900}%`, background: r.delta < 0 ? "#087f73" : "#c45127" }} /></div>
      <strong className={styles.costValue}>{money(Math.abs(r.delta))}<small>{r.delta < 0 ? "less" : "more"}</small></strong>
    </div>)}
    <div className={styles.barAxis}><span>−$45k</span><span>$0</span><span>+$45k</span></div>
  </div>;
}
export function Table({ headers, rows, label }: { headers: string[]; rows: ReactNode[][]; label: string }) {
  return <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={label}><table><caption className={styles.srOnly}>{label}</caption><thead><tr>{headers.map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => j === 0 ? <th scope="row" key={j}>{cell}</th> : <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
}
