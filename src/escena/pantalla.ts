/*
 * Dónde se ven en pantalla algunas cosas del 3D, para que la interfaz (DOM) les pegue
 * etiquetas y el bocadillo del dino. La escena lo escribe en cada cuadro (doses) y la capa
 * de la expo lo lee. Coordenadas en fracciones de la ventana (0..1, origen arriba a la izquierda).
 */
export type PuntoPantalla = { x: number; y: number; delante: boolean };

export const pantalla = {
  /** un punto por asteroide (índice = paso) */
  asteroides: [] as PuntoPantalla[],
  /** la cabeza del dino */
  cabeza: { x: 0.15, y: 0.3, delante: true } as PuntoPantalla,
  /** sube cada vez que se actualiza (para saber si hay datos nuevos) */
  version: 0,
};

// solo en desarrollo: para revisar desde la consola dónde quedan las cosas
if (import.meta.env.DEV) (window as unknown as { __pantalla: typeof pantalla }).__pantalla = pantalla;
