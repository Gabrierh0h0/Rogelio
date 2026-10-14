/*
 * Lo que se puede tocar en la expo (escenario elegido, umbral, año, fila
 * resaltada). Lo comparten el papel, las notas satélite y las etiquetas de los asteroides,
 * así que vive aquí y no dentro de un componente. Vuelve a su valor inicial al cambiar de paso.
 */
import { useSyncExternalStore } from "react";

export type EstadoExpo = {
  /** escenario elegido con los chips A/B/C */
  escenario: "A_completo" | "B_sin_MOID" | "C_sin_definicion";
  /** umbral del deslizador (paso 8); null = el calibrado */
  umbral: number | null;
  /** año del deslizador (paso 6); null = el último */
  anio: number | null;
  /** fila resaltada en las dos tablas (paso 3) */
  fila: string | null;
  /** curvas Precision-Recall visibles (paso 9) */
  curvas: Record<string, boolean>;
};

const INICIAL: EstadoExpo = {
  escenario: "B_sin_MOID",
  umbral: null,
  anio: null,
  fila: null,
  curvas: { A_completo: true, B_sin_MOID: true, C_sin_definicion: true },
};

let estado = INICIAL;
const oyentes = new Set<() => void>();

export function cambiarExpo(cambios: Partial<EstadoExpo>) {
  estado = { ...estado, ...cambios };
  for (const o of oyentes) o();
}

export function reiniciarExpo() {
  if (estado === INICIAL) return;
  estado = INICIAL;
  for (const o of oyentes) o();
}

export function useExpo() {
  return useSyncExternalStore(
    (cb) => {
      oyentes.add(cb);
      return () => oyentes.delete(cb);
    },
    () => estado,
  );
}
