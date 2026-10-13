/*
 * Preferencia del sistema "reducir movimiento". Vive aparte de enDoses.ts para que la
 * interfaz (DOM) pueda usarla sin cargar Three.js.
 */
import { useSyncExternalStore } from "react";

const consulta = "(prefers-reduced-motion: reduce)";

function suscribir(avisar: () => void) {
  const mq = window.matchMedia(consulta);
  mq.addEventListener("change", avisar);
  return () => mq.removeEventListener("change", avisar);
}

export function usePrefiereMenosMovimiento() {
  return useSyncExternalStore(
    suscribir,
    () => window.matchMedia(consulta).matches,
    () => false,
  );
}
