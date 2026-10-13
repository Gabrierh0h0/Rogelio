/*
 * Capa DOM de la cinemática final: destello del choque, cartel de papel "¡CATAPUM!" y la
 * tarjeta de cierre. El 3D (escena/Impacto.tsx) usa las mismas fases y tiempos.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { CINE, EVENTO_FINAL, type Fase } from "@/presentacion/cinematica";
import { TOTAL } from "@/presentacion/diapositivas";
import type { Disposicion } from "@/presentacion/disposicion";
import { ir } from "@/presentacion/navegacion";
import { PapelRasgado } from "./Papel";

/** Avanza las fases con temporizadores; se cancela si cambian de diapositiva. */
export function useCinematica(indice: number, quieto: boolean) {
  const [fase, setFase] = useState<Fase>("inactiva");
  const temporizadores = useRef<number[]>([]);

  const limpiar = () => {
    temporizadores.current.forEach((id) => window.clearTimeout(id));
    temporizadores.current = [];
  };

  const iniciar = useCallback(() => {
    limpiar();
    if (quieto) {
      setFase("final"); // sin destellos ni temblores: directo al cierre
      return;
    }
    // sin pasar por "inactiva": así el asteroide de la diapositiva no se vuelve a abrir al repetir
    const pasos: [Fase, number][] = [
      ["acercando", 0],
      ["impacto", CINE.impacto],
      ["despues", CINE.despues],
      ["final", CINE.final],
    ];
    temporizadores.current = pasos.map(([f, s]) => window.setTimeout(() => setFase(f), s * 1000));
  }, [quieto]);

  // el botón de la última diapositiva lanza el evento
  useEffect(() => {
    const lanzar = () => {
      if (indice === TOTAL - 1) iniciar();
    };
    window.addEventListener(EVENTO_FINAL, lanzar);
    return () => window.removeEventListener(EVENTO_FINAL, lanzar);
  }, [indice, iniciar]);

  // si cambian de diapositiva, la Tierra vuelve a estar intacta
  useEffect(() => {
    limpiar();
    setFase("inactiva");
  }, [indice]);

  useEffect(() => limpiar, []);
  return { fase, iniciar };
}

type Props = { fase: Fase; disp: Disposicion; onRepetir: () => void };

export function CapaCinematica({ fase, disp, onRepetir }: Props) {
  const { x0, x1, y0, y1 } = disp.panel;
  return (
    <>
      <p className="sr-only" aria-live="assertive">
        {fase === "impacto" ? "¡Un asteroide chocó contra la Tierra!" : ""}
      </p>

      {fase === "impacto" && <div className="destello pointer-events-none fixed inset-0 z-30" aria-hidden />}

      {fase === "impacto" && (
        // arriba a la izquierda: el dino sale volando hacia la derecha y no lo tapa
        <div className="pointer-events-none fixed z-30" style={{ left: "4%", top: "8%" }} aria-hidden>
          <PapelRasgado semilla={77} className="sale-del-crater -rotate-6" claseContenido="px-8 py-5">
            <span className="font-display text-[clamp(2.4rem,1.4rem+4vw,5rem)] font-extrabold leading-none text-[color:var(--arcilla-roja)]">
              ¡CATAPUM!
            </span>
          </PapelRasgado>
        </div>
      )}

      {fase === "final" && (
        <div
          className="fixed z-20 flex items-center justify-center"
          style={{ left: `${x0 * 100}%`, right: `${(1 - x1) * 100}%`, top: `${y0 * 100}%`, bottom: `${(1 - y1) * 100}%` }}
        >
          <PapelRasgado semilla={91} className="sale-del-crater w-full max-w-[640px]" claseContenido="px-10 py-9">
            <section aria-labelledby="titulo-final" className="flex flex-col gap-4">
              <p className="text-[length:var(--texto-etiqueta)] font-bold uppercase tracking-[0.12em] text-[color:var(--arcilla-roja)]">
                Fin
              </p>
              <h2 id="titulo-final" className="font-display text-[clamp(1.8rem,1.1rem+2.4vw,3rem)] font-extrabold leading-[1.02]">
                Por eso hay que detectarlos a tiempo.
              </h2>
              <p className="text-lg text-[color:var(--tinta-suave)]">¡Gracias por acompañarnos!</p>
              <div className="mt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onRepetir}
                  className="boton-plastilina min-h-12 bg-[color:var(--arcilla-roja)] px-6 font-display text-lg font-semibold text-crema"
                >
                  Repetir el final
                </button>
                <button
                  type="button"
                  onClick={() => ir(0)}
                  className="boton-plastilina min-h-12 bg-[color:var(--set-fieltro)] px-6 font-display text-lg font-semibold text-crema"
                >
                  Volver al inicio
                </button>
              </div>
            </section>
          </PapelRasgado>
        </div>
      )}
    </>
  );
}
