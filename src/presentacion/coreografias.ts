/*
 * Cinemáticas de llegada de cada asteroide (la expo usa una distinta por paso; el proyecto
 * completo usa siempre "geoda"). Aquí va lo que comparten el DOM y el 3D:
 * - panel: segundos desde el cambio de paso hasta que aparece el papel.
 * - entrada: clase CSS con la que entra el papel (styles/tokens.css).
 * El movimiento 3D de cada una está en escena/coreografias.ts y los efectos de pantalla en
 * ui/CapaCoreografia.tsx.
 */
import { DIAPOSITIVAS, type Cinematica } from "./diapositivas";
import { TIEMPOS } from "./disposicion";

export type InfoCoreografia = { panel: number; entrada: string };

export const COREOGRAFIAS: Record<Cinematica, InfoCoreografia> = {
  geoda: { panel: TIEMPOS.panel, entrada: "sale-del-crater" },
  marioneta: { panel: 1.4, entrada: "entra-telon" },
  huevo: { panel: 1.55, entrada: "entra-grieta" },
  partido: { panel: 1.3, entrada: "entra-partido" },
  tajadas: { panel: 1.6, entrada: "entra-masa" },
  cuchillo: { panel: 1.45, entrada: "entra-corte" },
  telescopio: { panel: 1.5, entrada: "entra-iris" },
  folds: { panel: 2.75, entrada: "sale-del-crater" },
  perilla: { panel: 2.0, entrada: "sale-del-crater" },
  red: { panel: 1.75, entrada: "entra-red" },
  calendario: { panel: 1.95, entrada: "entra-remolino" },
  atrapa: { panel: 2.45, entrada: "sale-del-crater" },
};

export function cinematicaDe(indice: number): Cinematica {
  return DIAPOSITIVAS[indice]?.cinematica ?? "geoda";
}

export function coreografiaDe(indice: number): InfoCoreografia {
  return COREOGRAFIAS[cinematicaDe(indice)];
}
