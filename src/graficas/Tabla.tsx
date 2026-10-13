/*
 * Tablita de plastilina: una tabla de verdad (<table>) sobre el papel, con el encabezado como
 * una tira de cinta, líneas de lápiz entre filas, la fila elegida pintada con marcador y las
 * filas apareciendo una a una en doses.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Columna = { titulo: ReactNode; alinear?: "izquierda" | "derecha" | "centro"; ancho?: string };
export type FilaTabla = {
  celdas: ReactNode[];
  /** la fila que importa: se pinta con marcador */
  destacada?: boolean;
  /** referencia (baseline, por ejemplo): más tenue */
  atenuada?: boolean;
};

type Props = {
  titulo?: string;
  columnas: Columna[];
  filas: FilaTabla[];
  /** primera columna como encabezado de fila (en negrita) */
  conEncabezadoDeFila?: boolean;
  compacta?: boolean;
  className?: string;
};

const ALINEAR = { izquierda: "text-left", derecha: "text-right", centro: "text-center" } as const;

export function TablaPlastilina({ titulo, columnas, filas, conEncabezadoDeFila = true, compacta, className }: Props) {
  const relleno = compacta ? "px-2.5 py-1" : "px-3 py-1.5";
  return (
    <figure className={cn("tabla-plastilina", className)}>
      {titulo && (
        <figcaption className="mb-1.5 text-[length:var(--texto-etiqueta)] font-bold uppercase tracking-[0.08em] text-[color:var(--tinta-suave)]">
          {titulo}
        </figcaption>
      )}
      <table className={cn("w-full border-separate border-spacing-0 tabular-nums", compacta ? "text-[clamp(0.82rem,0.74rem+0.25vw,0.98rem)]" : "text-[clamp(0.9rem,0.78rem+0.35vw,1.1rem)]")}>
        <thead>
          <tr className="tabla-plastilina__cinta">
            {columnas.map((c, i) => (
              <th
                key={i}
                scope="col"
                style={c.ancho ? { width: c.ancho } : undefined}
                className={cn(relleno, "font-display font-bold leading-tight", ALINEAR[c.alinear ?? (i === 0 ? "izquierda" : "derecha")])}
              >
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr
              key={i}
              className={cn(
                "tabla-plastilina__fila",
                f.destacada && "tabla-plastilina__fila--marcador",
                f.atenuada && "text-[color:var(--tinta-suave)] opacity-75",
              )}
              style={{ animationDelay: `calc(var(--cuadro) * ${3 + i * 2})` }}
            >
              {f.celdas.map((celda, j) => {
                const clase = cn(relleno, "leading-snug", ALINEAR[columnas[j]?.alinear ?? (j === 0 ? "izquierda" : "derecha")]);
                return j === 0 && conEncabezadoDeFila ? (
                  <th key={j} scope="row" className={cn(clase, "font-semibold")}>
                    {celda}
                  </th>
                ) : (
                  <td key={j} className={clase}>
                    {celda}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
