/*
 * Estado de navegación compartido por la interfaz (DOM) y la escena 3D.
 * La diapositiva actual vive en la URL (#1 ... #30): se puede enlazar directo a un paso
 * y el botón "atrás" del navegador funciona.
 * Cada paso puede armarse en varias capas (la expo): "siguiente" primero suma la capa que
 * sigue y, cuando ya están todas, pasa al siguiente asteroide. La capa no va en la URL.
 */
import { useSyncExternalStore } from "react";
import { DIAPOSITIVAS, TOTAL } from "./diapositivas";

function desdeHash(): number {
  const n = Number.parseInt(window.location.hash.replace("#", ""), 10);
  return Number.isFinite(n) ? Math.min(TOTAL, Math.max(1, n)) - 1 : 0;
}

export const capasDe = (i: number) => DIAPOSITIVAS[i]?.capas ?? 1;

let estado = { indice: desdeHash(), capa: 0 };
const oyentes = new Set<() => void>();

function avisar() {
  for (const o of oyentes) o();
}

window.addEventListener("hashchange", () => {
  const n = desdeHash();
  if (n !== estado.indice) {
    estado = { indice: n, capa: 0 };
    avisar();
  }
});

/** Va al paso n (en su primera capa, o en la que se pida: -1 = la última). */
export function ir(n: number, capa = 0) {
  const destino = Math.min(TOTAL - 1, Math.max(0, n));
  const c = capa < 0 ? capasDe(destino) - 1 : Math.min(capa, capasDe(destino) - 1);
  if (destino === estado.indice && c === estado.capa) return;
  const cambiaPaso = destino !== estado.indice;
  estado = { indice: destino, capa: c };
  if (cambiaPaso) window.history.pushState(null, "", `#${destino + 1}`);
  avisar();
}

export function siguiente() {
  if (estado.capa < capasDe(estado.indice) - 1) ir(estado.indice, estado.capa + 1);
  else ir(estado.indice + 1);
}

export function anterior() {
  if (estado.capa > 0) ir(estado.indice, estado.capa - 1);
  // al volver, el paso anterior aparece ya armado
  else ir(estado.indice - 1, -1);
}

function useEstado() {
  return useSyncExternalStore(
    (cb) => {
      oyentes.add(cb);
      return () => oyentes.delete(cb);
    },
    () => estado,
  );
}

export const useIndice = () => useEstado().indice;
export const useCapa = () => useEstado().capa;
