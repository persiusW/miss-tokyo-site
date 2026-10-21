// "Sales by day": the current period as an accent line over a soft area,
// the previous period dashed. Plain SVG, styled by .chart tokens.
import { ghs0 } from "./format";

export function LineChart({ cur, prev, labels, h = 220, label = "Sales by day" }: { cur: number[]; prev?: number[] | null; labels: string[]; h?: number; label?: string }) {
    const W = 640, H = h, P = 28;
    if (cur.length === 0) return null;
    const all = [...cur, ...(prev ?? [])];
    const top = Math.max(1, ...all) * 1.15;
    const step = cur.length > 1 ? (W - P * 2) / (cur.length - 1) : 0;
    const x = (i: number) => (cur.length > 1 ? P + i * step : W / 2);
    const y = (v: number) => H - P - (v / top) * (H - P * 2);
    const path = (a: number[]) => a.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
    // Keep labels readable: at most ~8 along the axis.
    const every = Math.max(1, Math.ceil(labels.length / 8));
    const summary = `${label}: ${cur.map((v, i) => `${labels[i]} ${ghs0(v)}`).join(", ")}`;
    return (
        <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={summary}>
            {[0, 0.5, 1].map(f => <line key={f} className="grid" x1={P} x2={W - P} y1={y((top / 1.15) * f)} y2={y((top / 1.15) * f)} />)}
            <path className="area" d={`${path(cur)} L${x(cur.length - 1)},${H - P} L${x(0)},${H - P}Z`} opacity=".6" />
            {prev && prev.length === cur.length && <path className="prev" d={path(prev)} />}
            <path className="cur" d={path(cur)} />
            {labels.map((l, i) => (i % every === 0 || i === labels.length - 1) && <text key={i} x={x(i)} y={H - 8} textAnchor="middle">{l}</text>)}
        </svg>
    );
}
