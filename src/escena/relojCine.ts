/*
 * Reloj de la cinemática final para el 3D. Cada pieza (impacto, Tierra, dino) tiene el suyo,
 * pero todos cuentan igual: segundos desde que empezó la caída, en doses.
 */
import { CINE, type Fase } from "@/presentacion/cinematica";

const INICIO_FASE: Record<Exclude<Fase, "inactiva">, number> = {
  acercando: 0,
  impacto: CINE.impacto,
  despues: CINE.despues,
  final: CINE.final,
};

export type RelojCine = { t0: number; fase: Fase };

export const crearReloj = (): RelojCine => ({ t0: -1, fase: "inactiva" });

/**
 * Segundos desde que empezó la cinemática, o null si no está corriendo.
 * Con "reducir movimiento" salta directo al final, ya quieto.
 */
export function segundosCine(r: RelojCine, fase: Fase, quieto: boolean, t: number): number | null {
  if (fase === "inactiva") {
    r.t0 = -1;
    r.fase = fase;
    return null;
  }
  // "Repetir el final": cada vez que vuelve a empezar la caída, el reloj arranca de cero
  if (fase === "acercando" && r.fase !== "acercando") r.t0 = -1;
  r.fase = fase;
  if (r.t0 < 0) r.t0 = t - (quieto ? CINE.final + 3 : INICIO_FASE[fase]);
  return t - r.t0;
}
