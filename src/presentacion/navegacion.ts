/*
 * Estado de navegación compartido por la interfaz (DOM) y la escena 3D.
 * La diapositiva actual vive en la URL (#1 ... #30): se puede enlazar directo a un paso
 * y el botón "atrás" del navegador funciona.
 */
import { useSyncExternalStore } from "react";
import { TOTAL } from "./diapositivas";

function desdeHash(): number {
  const n = Number.parseInt(window.location.hash.replace("#", ""), 10);
  return Number.isFinite(n) ? Math.min(TOTAL, Math.max(1, n)) - 1 : 0;
}

let indice = desdeHash();
const oyentes = new Set<() => void>();

function avisar() {
  for (const o of oyentes) o();
}

window.addEventListener("hashchange", () => {
  const n = desdeHash();
  if (n !== indice) {
    indice = n;
    avisar();
  }
});

export function ir(n: number) {
  const destino = Math.min(TOTAL - 1, Math.max(0, n));
  if (destino === indice) return;
  indice = destino;
  window.history.pushState(null, "", `#${destino + 1}`);
  avisar();
}

export const siguiente = () => ir(indice + 1);
export const anterior = () => ir(indice - 1);

export function useIndice() {
  return useSyncExternalStore(
    (cb) => {
      oyentes.add(cb);
      return () => oyentes.delete(cb);
    },
    () => indice,
  );
}
