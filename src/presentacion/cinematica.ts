/*
 * Cinemática final: un asteroide choca contra la Tierra, el dino sale volando, la Tierra
 * queda arrasada y sube al centro girando; el dino reaparece flotando a la deriva al fondo.
 * La interfaz (App) avanza las fases con temporizadores y la escena 3D dibuja cada fase
 * con su propio reloj en doses; ambos usan estos mismos tiempos.
 */
import type { Reaccion } from "./diapositivas";

export type Fase = "inactiva" | "acercando" | "impacto" | "despues" | "final";

/** Segundos desde que empieza la cinemática. */
export const CINE = {
  impacto: 2.4,
  /** la Tierra arrasada empieza a subir al centro de la pantalla */
  despues: 4.4,
  /** ya arriba, girando: aparece el mensaje y el dino flota al fondo */
  final: 6.2,
} as const;

/** Cómo reacciona el dino en cada fase. */
export const REACCION_FASE: Record<Exclude<Fase, "inactiva">, Reaccion> = {
  acercando: "susto",
  impacto: "sacudido",
  despues: "sacudido",
  final: "mareado",
};

/** Evento que lanza el botón "Ver el final" de la última diapositiva. */
export const EVENTO_FINAL = "presentacion:final";
