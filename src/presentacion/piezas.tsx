/*
 * Piezas compartidas por el contenido de las dos presentaciones (proyecto completo y expo):
 * bloques de maquetación, nombres legibles de las variables, escenarios y datos derivados.
 */
import type { ReactNode } from "react";
import { jpl, metricas, numero, principal, tablas } from "@/data/resultados";
import { fmt } from "@/lib/formato";
import { COLOR } from "@/graficas/Graficas";
import { EQUIPO } from "./equipo";

/* ------------------------------------------------------------------ ayudas de maquetación */

export const Lead = ({ children }: { children: ReactNode }) => (
  <p className="mt-3 text-[clamp(1rem,0.9rem+0.35vw,1.2rem)] leading-relaxed">{children}</p>
);
export const Nota = ({ children }: { children: ReactNode }) => (
  <p className="mt-3 text-sm leading-relaxed text-[color:var(--tinta-suave)]">{children}</p>
);
export const Cifras = ({ children }: { children: ReactNode[] | ReactNode }) => {
  const n = Math.min(4, Array.isArray(children) ? children.filter(Boolean).length : 1);
  return (
    <div className="mt-4 grid gap-x-8 gap-y-4" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
      {children}
    </div>
  );
};
export const Dos = ({ children }: { children: ReactNode }) => <div className="mt-4 grid gap-5 lg:grid-cols-2">{children}</div>;
export const Bloque = ({ children }: { children: ReactNode }) => <div className="mt-4">{children}</div>;
export const Lista = ({ items }: { items: ReactNode[] }) => (
  <ul className="mt-4 space-y-2.5">
    {items.map((it, i) => (
      <li key={i} className="flex gap-3 leading-snug">
        <span aria-hidden className="piedrita mt-1.5 size-2.5 shrink-0 bg-[color:var(--arcilla-roja)]" />
        <span>{it}</span>
      </li>
    ))}
  </ul>
);
export const Tarjeta = ({ titulo, children, color }: { titulo: string; children: ReactNode; color?: string }) => (
  <div
    className="rounded-[18px_14px_20px_12px/14px_20px_12px_18px] border-2 bg-[oklch(0.95_0.03_88/0.55)] p-4"
    style={{ borderColor: color ?? "rgba(60,40,20,.25)" }}
  >
    <p className="font-display text-lg font-bold" style={{ color: color ?? COLOR.tinta }}>
      {titulo}
    </p>
    <div className="mt-1 text-sm leading-snug">{children}</div>
  </div>
);

export const Equipo = () => (
  <div>
    <p className="text-sm font-bold uppercase tracking-[0.12em] text-[color:var(--arcilla-roja)]">Equipo</p>
    <ul className="mt-1.5 grid gap-x-6 gap-y-0.5 text-sm leading-snug sm:grid-cols-2">
      {EQUIPO.map((n) => (
        <li key={n}>{n}</li>
      ))}
    </ul>
  </div>
);

/* ------------------------------------------------------------------ nombres legibles */

export const NOMBRES: Record<string, string> = {
  "Minimum Orbit Intersection": "MOID",
  "Absolute Magnitude": "Magnitud absoluta (H)",
  "Est Dia in KM(min)": "Diámetro mínimo (km)",
  "Orbit Uncertainity": "Incertidumbre orbital",
  "Perihelion Distance": "Distancia de perihelio",
  "Relative Velocity km per sec": "Velocidad relativa",
  "Miss Dist.(Astronomical)": "Distancia de paso",
  Eccentricity: "Excentricidad",
  Inclination: "Inclinación",
  "Jupiter Tisserand Invariant": "Invariante de Tisserand",
  "Semi Major Axis": "Semieje mayor",
  "Asc Node Longitude": "Nodo ascendente",
  "Orbital Period": "Periodo orbital",
  "Perihelion Arg": "Argumento del perihelio",
  "Aphelion Dist": "Distancia de afelio",
  "Perihelion Time": "Tiempo de perihelio",
  "Mean Anomaly": "Anomalía media",
  "Mean Motion": "Movimiento medio",
  "Epoch Osculation": "Época de osculación",
};
export const nombre = (c: string) => NOMBRES[c] ?? c;

export const ESC = { A_completo: "A · completo", B_sin_MOID: "B · sin MOID", C_sin_definicion: "C · sin MOID, H ni diámetro" } as const;
export type Escenario = keyof typeof ESC;
export const ESCENARIOS: Escenario[] = ["A_completo", "B_sin_MOID", "C_sin_definicion"];
export const SERIES_ESC = [
  { nombre: "A", color: COLOR.A },
  { nombre: "B (desplegado)", color: COLOR.B },
  { nombre: "C", color: COLOR.C },
];

/* ------------------------------------------------------------------ datos derivados */

export const evalB = metricas.evaluacion_por_escenario.B_sin_MOID;
export const evalJ = jpl.evaluacion;
export const confB = principal.confusion_b_test;
export const pctTotal = (n: number) => fmt.porcentaje(n / metricas.dataset.filas, 1);
export const benchmark = (esc: Escenario) => tablas.benchmarkCv.filter((f) => f.Escenario === esc);
export const pr = (esc: Escenario, modelo: string) =>
  numero(benchmark(esc).find((f) => f.Modelo === modelo)!, "pr_auc");
