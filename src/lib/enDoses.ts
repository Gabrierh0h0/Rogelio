/*
 * Animación "en doses": la escena solo se redibuja 12 veces por segundo
 * (frameloop="demand" + este reloj), como un set de stop motion. Además de
 * dar el look, ahorra batería y GPU en tablets.
 */
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

export const FPS_DOSES = 12;

/** Pide un cuadro nuevo a R3F cada 1/fps segundos. Va dentro del <Canvas>. */
export function RelojEnDoses({ fps = FPS_DOSES, activo = true }: { fps?: number; activo?: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!activo) {
      invalidate();
      return;
    }
    const id = window.setInterval(() => invalidate(), 1000 / fps);
    return () => window.clearInterval(id);
  }, [fps, activo, invalidate]);
  return null;
}

/** Índice del cuadro actual a partir del reloj de R3F. */
export function cuadroActual(segundos: number, fps = FPS_DOSES) {
  return Math.floor(segundos * fps);
}

/** Desplazamiento pseudoaleatorio pero estable por cuadro: el "temblor" de manipular la pieza. */
export function temblor(cuadro: number, semilla = 0, amplitud = 1) {
  const x = Math.sin((cuadro + 1) * 12.9898 + semilla * 78.233) * 43758.5453;
  return ((x - Math.floor(x)) * 2 - 1) * amplitud;
}
