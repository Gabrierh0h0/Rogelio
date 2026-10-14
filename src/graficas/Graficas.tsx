/*
 * Gráficas de plastilina sobre pergamino (SVG propio).
 * Reglas (skill dataviz): marcas delgadas con puntas redondeadas, líneas de 3 px, etiquetas
 * en tinta (nunca en el color de la serie), leyenda + etiqueta directa cuando hay >= 2 series,
 * un solo eje Y, y una tabla oculta con los mismos datos para lectores de pantalla.
 * Estilo: las marcas pasan por un filtro de "trazo tembloroso" que hierve en doses.
 */
import { useId, useMemo, useState, type ReactNode } from "react";
import { usePrefiereMenosMovimiento } from "@/lib/movimiento";
import { Contador } from "@/ui/Capa";

/** Paleta validada con validate_palette.js (skill dataviz) sobre el pergamino (#ead9b0). */
export const COLOR = {
  peligroso: "#b0442c",
  noPeligroso: "#1e6aa8",
  A: "#1e6aa8",
  B: "#a5600f",
  C: "#9a3f86",
  tinta: "#2e241a",
  tintaSuave: "#5c4a36",
  rejilla: "rgba(60, 40, 20, 0.16)",
} as const;

/** Defs compartidos: trazo tembloroso (hierve cada 2 cuadros) y relieve de plastilina. */
export function FiltrosPlastilina() {
  const quieto = usePrefiereMenosMovimiento();
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <defs>
        <filter id="trazo-mano" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="2">
            {!quieto && (
              <animate attributeName="seed" values="2;5;8" dur="0.5s" calcMode="discrete" repeatCount="indefinite" />
            )}
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="2.6" />
        </filter>
        <linearGradient id="relieve" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.16" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function TablaOculta({ titulo, columnas, filas }: { titulo: string; columnas: string[]; filas: (string | number)[][] }) {
  return (
    // una tabla ignora height: 1px, por eso va dentro de un div oculto (si no, estira el papel)
    <div className="sr-only">
    <table>
      <caption>{titulo}</caption>
      <thead>
        <tr>
          {columnas.map((c, i) => (
            <th key={i} scope="col">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((f, i) => (
          <tr key={i}>
            {f.map((v, j) => (
              <td key={j}>{v}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

function Leyenda({ items }: { items: { nombre: string; color: string; punteada?: boolean }[] }) {
  return (
    <ul className="mb-1 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-[color:var(--tinta-suave)]">
      {items.map((it) => (
        <li key={it.nombre} className="flex items-center gap-1.5">
          <svg width="18" height="8" aria-hidden>
            <line x1="1" x2="17" y1="4" y2="4" stroke={it.color} strokeWidth="3" strokeLinecap="round" strokeDasharray={it.punteada ? "3 4" : undefined} />
          </svg>
          {it.nombre}
        </li>
      ))}
    </ul>
  );
}

function Marco({ titulo, children, leyenda }: { titulo: string; children: ReactNode; leyenda?: ReactNode }) {
  return (
    <figure className="w-full">
      <figcaption className="mb-1 text-sm font-bold uppercase tracking-[0.08em] text-[color:var(--tinta-suave)]">{titulo}</figcaption>
      {leyenda}
      {children}
    </figure>
  );
}

const TEXTO = "fill-[#5c4a36] text-[11px]";
const TEXTO_FUERTE = "fill-[#2e241a] text-[11px] font-bold";

/* ------------------------------------------------------------------ líneas */

export type Serie = {
  nombre: string;
  color: string;
  puntos: [number, number][];
  punteada?: boolean;
  /** banda de incertidumbre (± desviación) */
  banda?: { inferior: [number, number][]; superior: [number, number][] };
};
type Marca = { valor: number; etiqueta: string; color?: string };

export function GraficaLineas({
  titulo,
  series,
  x,
  y,
  marcasX = [],
  marcasY = [],
  alto = 190,
  ancho = 640,
  formatoX = (v: number) => String(v),
  formatoY = (v: number) => v.toFixed(2),
  etiquetaX,
  etiquetaY,
}: {
  titulo: string;
  series: Serie[];
  x: [number, number];
  y: [number, number];
  marcasX?: Marca[];
  marcasY?: Marca[];
  alto?: number;
  ancho?: number;
  formatoX?: (v: number) => string;
  formatoY?: (v: number) => string;
  etiquetaX: string;
  etiquetaY: string;
}) {
  const m = { izq: 46, der: 16, arr: 10, aba: 38 };
  const sx = (v: number) => m.izq + ((v - x[0]) / (x[1] - x[0])) * (ancho - m.izq - m.der);
  const sy = (v: number) => alto - m.aba - ((v - y[0]) / (y[1] - y[0])) * (alto - m.arr - m.aba);
  const ticksY = useMemo(() => Array.from({ length: 5 }, (_, i) => y[0] + ((y[1] - y[0]) * i) / 4), [y]);
  const ticksX = useMemo(() => Array.from({ length: 6 }, (_, i) => x[0] + ((x[1] - x[0]) * i) / 5), [x]);
  const [cursor, setCursor] = useState<number | null>(null);
  const base = series[0];

  const camino = (pts: [number, number][], continua = false) =>
    pts.map(([a, b], i) => `${i || continua ? "L" : "M"}${sx(a).toFixed(1)},${sy(b).toFixed(1)}`).join("");
  const cercano =
    cursor === null
      ? null
      : base.puntos.reduce((mejor, p, i) => (Math.abs(p[0] - cursor) < Math.abs(base.puntos[mejor][0] - cursor) ? i : mejor), 0);

  return (
    <Marco titulo={titulo} leyenda={series.length > 1 ? <Leyenda items={series} /> : undefined}>
      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        className="w-full overflow-visible"
        role="img"
        aria-label={`${titulo}. Series: ${series.map((s) => s.nombre).join(", ")}.`}
        onPointerLeave={() => setCursor(null)}
        onPointerMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * ancho;
          setCursor(x[0] + ((px - m.izq) / (ancho - m.izq - m.der)) * (x[1] - x[0]));
        }}
      >
        {ticksY.map((t) => (
          <g key={t}>
            <line x1={m.izq} x2={ancho - m.der} y1={sy(t)} y2={sy(t)} stroke={COLOR.rejilla} strokeDasharray="2 5" />
            <text x={m.izq - 8} y={sy(t) + 4} textAnchor="end" className={TEXTO}>
              {formatoY(t)}
            </text>
          </g>
        ))}
        {ticksX.map((t) => (
          <text key={t} x={sx(t)} y={alto - m.aba + 16} textAnchor="middle" className={TEXTO}>
            {formatoX(t)}
          </text>
        ))}
        <text x={(m.izq + ancho - m.der) / 2} y={alto - 4} textAnchor="middle" className={`${TEXTO} font-semibold`}>
          {etiquetaX}
        </text>
        <text transform={`translate(11 ${(alto - m.aba + m.arr) / 2}) rotate(-90)`} textAnchor="middle" className={`${TEXTO} font-semibold`}>
          {etiquetaY}
        </text>
        {marcasY.map((mk) => (
          <g key={mk.etiqueta}>
            <line x1={m.izq} x2={ancho - m.der} y1={sy(mk.valor)} y2={sy(mk.valor)} stroke={mk.color ?? COLOR.tintaSuave} strokeDasharray="5 5" strokeWidth={1.5} />
            <text x={ancho - m.der} y={sy(mk.valor) - 5} textAnchor="end" className={TEXTO_FUERTE}>
              {mk.etiqueta}
            </text>
          </g>
        ))}
        <g filter="url(#trazo-mano)">
          {series.map((s) =>
            s.banda ? (
              <path
                key={`${s.nombre}-banda`}
                d={`${camino(s.banda.superior)}${camino(s.banda.inferior.slice().reverse(), true)}Z`}
                fill={s.color}
                opacity={0.15}
              />
            ) : null,
          )}
          {series.map((s) => (
            <path
              key={s.nombre}
              d={camino(s.puntos)}
              fill="none"
              stroke={s.color}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={s.punteada ? "2 7" : undefined}
            />
          ))}
        </g>
        {marcasX.map((mk, i) => (
          <g key={mk.etiqueta}>
            <line x1={sx(mk.valor)} x2={sx(mk.valor)} y1={m.arr} y2={alto - m.aba} stroke={mk.color ?? COLOR.tinta} strokeWidth={2} strokeDasharray="6 4" />
            <text x={sx(mk.valor) + 6} y={m.arr + 12 + i * 15} className={TEXTO_FUERTE}>
              {mk.etiqueta}
            </text>
          </g>
        ))}
        {cercano !== null && (
          <g pointerEvents="none">
            <line x1={sx(base.puntos[cercano][0])} x2={sx(base.puntos[cercano][0])} y1={m.arr} y2={alto - m.aba} stroke={COLOR.tinta} strokeOpacity={0.35} />
            {series.map((s) => {
              const p = s.puntos[Math.min(cercano, s.puntos.length - 1)];
              return <circle key={s.nombre} cx={sx(p[0])} cy={sy(p[1])} r={5} fill={s.color} stroke="#f5ead0" strokeWidth={2} />;
            })}
            <g transform={`translate(${Math.min(sx(base.puntos[cercano][0]) + 10, ancho - 190)} ${m.arr + 4})`}>
              <rect width={180} height={22 + series.length * 16} rx={6} fill="#f5ead0" stroke="rgba(60,40,20,.35)" />
              <text x={10} y={16} className={TEXTO_FUERTE}>
                {etiquetaX}: {formatoX(base.puntos[cercano][0])}
              </text>
              {series.map((s, i) => (
                <text key={s.nombre} x={10} y={32 + i * 16} className="fill-[#2e241a] text-[11px]">
                  {s.nombre}: {formatoY(s.puntos[Math.min(cercano, s.puntos.length - 1)][1])}
                </text>
              ))}
            </g>
          </g>
        )}
      </svg>
      <TablaOculta
        titulo={titulo}
        columnas={[etiquetaX, ...series.map((s) => s.nombre)]}
        filas={base.puntos.map((p, i) => [formatoX(p[0]), ...series.map((s) => formatoY((s.puntos[i] ?? p)[1]))])}
      />
    </Marco>
  );
}

/* ------------------------------------------------------------------ barras horizontales */

export type FilaBarra = { etiqueta: string; valor: number; color?: string; tenue?: boolean; destacada?: boolean };

export function BarrasH({
  titulo,
  filas,
  max,
  formato = (v: number) => v.toFixed(3),
  color = COLOR.B,
  marcas = [],
  anchoEtiqueta = 200,
  ancho = 640,
}: {
  titulo: string;
  filas: FilaBarra[];
  max?: number;
  formato?: (v: number) => string;
  color?: string;
  marcas?: Marca[];
  anchoEtiqueta?: number;
  ancho?: number;
}) {
  const izq = anchoEtiqueta;
  const der = 70;
  const alto = 27;
  const tope = max ?? Math.max(...filas.map((f) => f.valor)) * 1.05;
  const sx = (v: number) => izq + (v / tope) * (ancho - izq - der);
  const total = filas.length * alto + (marcas.length ? 22 : 8);
  return (
    <Marco titulo={titulo}>
      <svg viewBox={`0 0 ${ancho} ${total}`} className="w-full" role="img" aria-label={titulo}>
        {marcas.map((mk) => (
          <g key={mk.etiqueta}>
            <line x1={sx(mk.valor)} x2={sx(mk.valor)} y1={0} y2={total - 16} stroke={mk.color ?? COLOR.tinta} strokeDasharray="5 4" strokeWidth={1.5} />
            <text x={sx(mk.valor)} y={total - 3} textAnchor="middle" className="fill-[#2e241a] text-[10.5px] font-bold">
              {mk.etiqueta}
            </text>
          </g>
        ))}
        {filas.map((f, i) => {
          const y = i * alto + 6;
          const w = Math.max(6, sx(f.valor) - izq);
          return (
            <g key={f.etiqueta}>
              <title>{`${f.etiqueta}: ${formato(f.valor)}`}</title>
              <text x={izq - 10} y={y + 15} textAnchor="end" className={`fill-[#2e241a] text-[12.5px] ${f.destacada ? "font-extrabold" : "font-semibold"}`}>
                {f.etiqueta}
              </text>
              <g filter="url(#trazo-mano)" opacity={f.tenue ? 0.42 : 1}>
                <rect x={izq} y={y + 2} width={w} height={alto - 12} rx={9} fill={f.color ?? color} />
                <rect x={izq} y={y + 2} width={w} height={alto - 12} rx={9} fill="url(#relieve)" />
              </g>
              <text x={izq + w + 8} y={y + 15} className="fill-[#2e241a] text-[12.5px] font-bold">
                {formato(f.valor)}
              </text>
            </g>
          );
        })}
      </svg>
      <TablaOculta titulo={titulo} columnas={["", "valor"]} filas={filas.map((f) => [f.etiqueta, formato(f.valor)])} />
    </Marco>
  );
}

/* ------------------------------------------------------------------ barras agrupadas */

export function BarrasAgrupadas({
  titulo,
  grupos,
  series,
  max,
  formato = (v: number) => v.toFixed(2),
  alto = 175,
  notas,
}: {
  titulo: string;
  grupos: { etiqueta: string; valores: number[] }[];
  series: { nombre: string; color: string }[];
  max?: number;
  formato?: (v: number) => string;
  alto?: number;
  /** texto bajo cada grupo (p. ej. "+16.2 puntos") */
  notas?: string[];
}) {
  const ancho = 640;
  const m = { izq: 12, der: 12, arr: 22, aba: notas ? 46 : 30 };
  const tope = max ?? Math.max(...grupos.flatMap((g) => g.valores)) * 1.1;
  const anchoGrupo = (ancho - m.izq - m.der) / grupos.length;
  const anchoBarra = Math.min(54, (anchoGrupo * 0.7) / series.length);
  const sy = (v: number) => alto - m.aba - (v / tope) * (alto - m.arr - m.aba);
  return (
    <Marco titulo={titulo} leyenda={series.length > 1 ? <Leyenda items={series} /> : undefined}>
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="w-full" role="img" aria-label={titulo}>
        <line x1={m.izq} x2={ancho - m.der} y1={sy(0)} y2={sy(0)} stroke={COLOR.tintaSuave} strokeWidth={1.5} />
        {grupos.map((g, gi) => {
          const x0 = m.izq + gi * anchoGrupo + (anchoGrupo - anchoBarra * series.length - 4 * (series.length - 1)) / 2;
          return (
            <g key={g.etiqueta}>
              {g.valores.map((v, si) => {
                const x = x0 + si * (anchoBarra + 4);
                return (
                  <g key={si}>
                    <title>{`${g.etiqueta} · ${series[si].nombre}: ${formato(v)}`}</title>
                    <g filter="url(#trazo-mano)">
                      <rect x={x} y={sy(v)} width={anchoBarra} height={Math.max(2, sy(0) - sy(v))} rx={8} fill={series[si].color} />
                      <rect x={x} y={sy(v)} width={anchoBarra} height={Math.max(2, sy(0) - sy(v))} rx={8} fill="url(#relieve)" />
                    </g>
                    <text x={x + anchoBarra / 2} y={sy(v) - 6} textAnchor="middle" className="fill-[#2e241a] text-[11.5px] font-bold">
                      {formato(v)}
                    </text>
                  </g>
                );
              })}
              <text x={m.izq + gi * anchoGrupo + anchoGrupo / 2} y={sy(0) + 17} textAnchor="middle" className="fill-[#2e241a] text-[12px] font-semibold">
                {g.etiqueta}
              </text>
              {notas?.[gi] && (
                <text x={m.izq + gi * anchoGrupo + anchoGrupo / 2} y={sy(0) + 34} textAnchor="middle" className="fill-[#2e241a] text-[12px] font-extrabold">
                  {notas[gi]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <TablaOculta titulo={titulo} columnas={["", ...series.map((s) => s.nombre)]} filas={grupos.map((g) => [g.etiqueta, ...g.valores.map(formato)])} />
    </Marco>
  );
}

/* ------------------------------------------------------------------ puntos por escenario */

export function PuntosEscenarios({
  titulo,
  filas,
  series,
  dominio = [0, 1],
  formato = (v: number) => v.toFixed(3),
}: {
  titulo: string;
  filas: { etiqueta: string; valores: (number | null)[]; destacada?: boolean }[];
  series: { nombre: string; color: string }[];
  dominio?: [number, number];
  formato?: (v: number) => string;
}) {
  const ancho = 640;
  const izq = 170;
  const der = 20;
  const alto = 21;
  const total = filas.length * alto + 26;
  const sx = (v: number) => izq + ((v - dominio[0]) / (dominio[1] - dominio[0])) * (ancho - izq - der);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => dominio[0] + t * (dominio[1] - dominio[0]));
  return (
    <Marco titulo={titulo} leyenda={<Leyenda items={series} />}>
      <svg viewBox={`0 0 ${ancho} ${total}`} className="w-full" role="img" aria-label={titulo}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={0} y2={total - 22} stroke={COLOR.rejilla} strokeDasharray="2 5" />
            <text x={sx(t)} y={total - 6} textAnchor="middle" className={TEXTO}>
              {t.toFixed(2)}
            </text>
          </g>
        ))}
        {filas.map((f, i) => {
          const y = i * alto + 14;
          const vals = f.valores.filter((v): v is number => v !== null);
          return (
            <g key={f.etiqueta}>
              <text x={izq - 10} y={y + 4} textAnchor="end" className={`fill-[#2e241a] text-[12px] ${f.destacada ? "font-extrabold" : "font-semibold"}`}>
                {f.etiqueta}
              </text>
              <line x1={sx(Math.min(...vals))} x2={sx(Math.max(...vals))} y1={y} y2={y} stroke={COLOR.tintaSuave} strokeOpacity={0.4} strokeWidth={3} strokeLinecap="round" />
              <g filter="url(#trazo-mano)">
                {f.valores.map((v, si) =>
                  v === null ? null : (
                    <circle key={si} cx={sx(v)} cy={y} r={6} fill={series[si].color} stroke="#f2e4c2" strokeWidth={2}>
                      <title>{`${f.etiqueta} · ${series[si].nombre}: ${formato(v)}`}</title>
                    </circle>
                  ),
                )}
              </g>
            </g>
          );
        })}
      </svg>
      <TablaOculta
        titulo={titulo}
        columnas={["", ...series.map((s) => s.nombre)]}
        filas={filas.map((f) => [f.etiqueta, ...f.valores.map((v) => (v === null ? "—" : formato(v)))])}
      />
    </Marco>
  );
}

/* ------------------------------------------------------------------ matriz de confusión */

export function MatrizConfusion({
  titulo,
  vn,
  fp,
  fn,
  vp,
  filas = ["Real: no peligroso", "Real: peligroso"],
  columnas = ["Dijo: no peligroso", "Dijo: peligroso"],
  etiquetas = ["acierta", "falsa alarma", "se escapa", "detecta"],
  animada = false,
}: {
  titulo: string;
  vn: number;
  fp: number;
  fn: number;
  vp: number;
  filas?: [string, string];
  columnas?: [string, string];
  etiquetas?: [string, string, string, string];
  /** expo: las fichas caen una a una y los números cuentan */
  animada?: boolean;
}) {
  const id = useId();
  const celdas = [
    { v: vn, fondo: "rgba(30,106,168,0.14)", borde: COLOR.noPeligroso },
    { v: fp, fondo: "rgba(165,96,15,0.14)", borde: COLOR.B },
    { v: fn, fondo: "rgba(176,68,44,0.2)", borde: COLOR.peligroso },
    { v: vp, fondo: "rgba(30,106,168,0.14)", borde: COLOR.noPeligroso },
  ];
  return (
    <figure aria-labelledby={id} className="w-full">
      <figcaption id={id} className="mb-2 text-sm font-bold uppercase tracking-[0.08em] text-[color:var(--tinta-suave)]">
        {titulo}
      </figcaption>
      <div className="grid grid-cols-[auto_1fr_1fr] gap-2 text-center text-[13px]">
        <span />
        {columnas.map((c) => (
          <span key={c} className="font-bold text-[color:var(--tinta-suave)]">
            {c}
          </span>
        ))}
        {[0, 1].map((r) => (
          <div key={r} className="contents">
            <span className="self-center text-right font-bold text-[color:var(--tinta-suave)]">{filas[r]}</span>
            {[0, 1].map((c) => {
              const celda = celdas[r * 2 + c];
              return (
                <div
                  key={c}
                  className={`boton-plastilina grid place-items-center px-2 py-3${animada ? " ficha-cae" : ""}`}
                  style={{
                    background: celda.fondo,
                    boxShadow: `inset 0 0 0 2px ${celda.borde}, 0 3px 0 rgba(60,40,20,.25)`,
                    animationDelay: animada ? `calc(var(--cuadro) * ${2 + (r * 2 + c) * 3})` : undefined,
                  }}
                >
                  <span className="font-display text-3xl font-extrabold leading-none">
                    {animada ? <Contador hasta={celda.v} formato={(v) => Math.round(v).toLocaleString("en-US")} /> : celda.v.toLocaleString("en-US")}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wide text-[color:var(--tinta-suave)]">{etiquetas[r * 2 + c]}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------------ cifra grande */

export function Cifra({
  valor,
  etiqueta,
  nota,
  tono = "tinta",
  cuenta,
}: {
  valor: string;
  etiqueta: string;
  nota?: string;
  tono?: "tinta" | "peligro" | "ok" | "acento";
  /** expo: la cifra sube contando hasta este número (valor queda como texto final y medida) */
  cuenta?: { hasta: number; formato: (v: number) => string };
}) {
  const color = { tinta: COLOR.tinta, peligro: COLOR.peligroso, ok: COLOR.noPeligroso, acento: COLOR.B }[tono];
  return (
    <div className="flex flex-col">
      <span
        className={`whitespace-nowrap font-display font-extrabold leading-none ${
          valor.length > 8 ? "text-[clamp(1.15rem,0.7rem+1.1vw,1.85rem)]" : "text-[clamp(1.5rem,0.9rem+1.6vw,2.5rem)]"
        }`}
        style={{ color }}
      >
        {cuenta ? <Contador hasta={cuenta.hasta} formato={cuenta.formato} /> : valor}
      </span>
      <span className="mt-1 text-sm font-bold leading-snug text-[color:var(--tinta-suave)]">{etiqueta}</span>
      {nota && <span className="text-xs leading-snug text-[color:var(--tinta-suave)]">{nota}</span>}
    </div>
  );
}
