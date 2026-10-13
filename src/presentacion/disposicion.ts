/*
 * Una sola fuente de verdad para el encuadre: dónde va el panel de papel (DOM) y dónde
 * queda la isla del dino (3D). El asteroide activo se abre justo detrás del panel, así
 * que la escena y la interfaz tienen que usar las mismas medidas.
 */
export type Modo = "horizontal" | "vertical";

export type Disposicion = {
  modo: Modo;
  /** Rectángulo del panel en fracciones de la ventana (0..1, origen arriba a la izquierda). */
  panel: { x0: number; x1: number; y0: number; y1: number };
  /** Posición de la isla (planeta + dino) en el mundo. */
  isla: [number, number, number];
  /** Centro y radios (x, z) de la órbita de los asteroides. */
  orbita: { centro: [number, number, number]; rx: number; rz: number };
  camara: { posicion: [number, number, number]; mira: [number, number, number]; fov: number };
};

export function disposicion(ancho: number, alto: number): Disposicion {
  const aspecto = ancho / Math.max(1, alto);
  if (aspecto >= 1.1) {
    return {
      modo: "horizontal",
      panel: { x0: 0.4, x1: 0.965, y0: 0.07, y1: 0.85 },
      // más arriba que antes para que se vea media Tierra con sus continentes
      isla: [-3.05, -1.3, 0],
      orbita: { centro: [-1.2, 0.4, -2.4], rx: 5.6, rz: 2.6 },
      camara: { posicion: [0, 0.35, 9.2], mira: [0, 0.2, 0], fov: 35 },
    };
  }
  // vertical (tablet de pie, teléfono): panel arriba, dino abajo
  const distancia = 9.2 * Math.min(1.9, Math.max(1.2, 1.25 / aspecto));
  return {
    modo: "vertical",
    // más angosto que la pantalla para que las mitades del asteroide asomen a los lados
    panel: { x0: 0.1, x1: 0.9, y0: 0.035, y1: 0.56 },
    isla: [0, -2.7, 0],
    orbita: { centro: [0, -0.8, -1.8], rx: 3.4, rz: 2.2 },
    camara: { posicion: [0, 0.4, distancia], mira: [0, 0.2, 0], fov: 35 },
  };
}

/** Coreografía de cada cambio de diapositiva, en segundos (se dibuja en doses). */
export const TIEMPOS = {
  vuelo: 0.75,
  temblor: 0.25,
  apertura: 0.35,
  cierre: 0.25,
  regreso: 0.6,
  /** cuándo aparece el panel, contado desde el cambio */
  get panel() {
    return this.vuelo + this.temblor + this.apertura * 0.6;
  },
};

/** Distancia del asteroide abierto a la cámara. */
export const DISTANCIA_ANCLA = 5.2;
