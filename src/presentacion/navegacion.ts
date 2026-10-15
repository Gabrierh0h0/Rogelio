/*
 * Estado de navegación compartido por la interfaz (DOM) y la escena 3D.
 * La diapositiva actual vive en la URL (#1 ... #30): se puede enlazar directo a un paso
 * y el botón "atrás" del navegador funciona.
 * Cada paso puede armarse en varias capas (la expo): las capas aparecen solas, una tras otra,
 * después de que entra el papel. "Siguiente" adelanta la capa que falta y, cuando ya están todas,
 * pasa al siguiente asteroide. La capa no va en la URL.
 */
import { useSyncExternalStore } from "react";
import { visorAbierto } from "@/notebooks/estado";
import { coreografiaDe } from "./coreografias";
import { DIAPOSITIVAS, TOTAL } from "./diapositivas";

/** segundos que se deja ver el papel solo antes de la segunda capa, y entre una capa y la siguiente */
const ESPERA_PRIMERA_CAPA = 1.6;
const ESPERA_ENTRE_CAPAS = 2.6;

function desdeHash(): number {
  const n = Number.parseInt(window.location.hash.replace("#", ""), 10);
  return Number.isFinite(n) ? Math.min(TOTAL, Math.max(1, n)) - 1 : 0;
}

export const capasDe = (i: number) => DIAPOSITIVAS[i]?.capas ?? 1;

let estado = { indice: desdeHash(), capa: 0 };
const oyentes = new Set<() => void>();

let reloj: number | undefined;

/** Programa la capa que sigue del paso actual; `primera` = el papel acaba de llegar. */
function programarCapa(primera: boolean) {
  window.clearTimeout(reloj);
  reloj = undefined;
  if (estado.capa >= capasDe(estado.indice) - 1) return;
  const espera = primera ? coreografiaDe(estado.indice).panel + ESPERA_PRIMERA_CAPA : ESPERA_ENTRE_CAPAS;
  const { indice, capa } = estado;
  reloj = window.setTimeout(function sumar() {
    // con el visor del notebook abierto se espera a que lo cierren
    if (visorAbierto()) {
      reloj = window.setTimeout(sumar, 500);
      return;
    }
    if (estado.indice === indice && estado.capa === capa) cambiar(indice, capa + 1, false);
  }, espera * 1000);
}

function avisar() {
  for (const o of oyentes) o();
}

window.addEventListener("hashchange", () => {
  const n = desdeHash();
  if (n !== estado.indice) {
    estado = { indice: n, capa: 0 };
    programarCapa(true);
    avisar();
  }
});

function cambiar(destino: number, c: number, cambiaPaso: boolean, automatico = true) {
  estado = { indice: destino, capa: c };
  if (cambiaPaso) window.history.pushState(null, "", `#${destino + 1}`);
  if (automatico) programarCapa(cambiaPaso && c === 0);
  else window.clearTimeout(reloj);
  avisar();
}

/** Va al paso n (en su primera capa, o en la que se pida: -1 = la última). */
export function ir(n: number, capa = 0) {
  const destino = Math.min(TOTAL - 1, Math.max(0, n));
  const c = capa < 0 ? capasDe(destino) - 1 : Math.min(capa, capasDe(destino) - 1);
  if (destino === estado.indice && c === estado.capa) return;
  cambiar(destino, c, destino !== estado.indice);
}

export function siguiente() {
  if (estado.capa < capasDe(estado.indice) - 1) ir(estado.indice, estado.capa + 1);
  else ir(estado.indice + 1);
}

export function anterior() {
  // al quitar una capa a mano, las capas ya no vuelven a aparecer solas en ese paso
  if (estado.capa > 0) cambiar(estado.indice, estado.capa - 1, false, false);
  // al volver, el paso anterior aparece ya armado
  else ir(estado.indice - 1, -1);
}

// al abrir la presentación directo en un paso
programarCapa(true);

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
