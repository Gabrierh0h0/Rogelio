/*
 * El papel con el contenido de la diapositiva. Aparece cuando el asteroide ya se abrió
 * detrás (TIEMPOS.panel), con una entrada en doses. Mide lo mismo que usa la escena 3D
 * para colocar el asteroide abierto (src/presentacion/disposicion.ts).
 */
import { useEffect, useState } from "react";
import { capituloDe, DIAPOSITIVAS, TOTAL } from "@/presentacion/diapositivas";
import { TIEMPOS, type Disposicion } from "@/presentacion/disposicion";
import { ContenidoDiapositiva } from "@/presentacion/contenido";
import { PapelRasgado } from "./Papel";

type Props = { indice: number; disp: Disposicion; quieto: boolean; oculto?: boolean };

export function Panel({ indice, disp, quieto, oculto = false }: Props) {
  const [visible, setVisible] = useState(indice);
  const [mostrar, setMostrar] = useState(true);

  // Primera carga: el asteroide ya está abierto, el panel aparece de una.
  useEffect(() => {
    if (indice === visible) return;
    setMostrar(false);
    const espera = quieto ? 0 : TIEMPOS.panel * 1000;
    const id = window.setTimeout(() => {
      setVisible(indice);
      setMostrar(true);
    }, espera);
    return () => window.clearTimeout(id);
  }, [indice, visible, quieto]);

  const d = DIAPOSITIVAS[visible];
  const capitulo = capituloDe(visible);
  const { x0, x1, y0, y1 } = disp.panel;

  return (
    <main
      className="pointer-events-none fixed z-10 flex items-center justify-center"
      style={{ left: `${x0 * 100}%`, right: `${(1 - x1) * 100}%`, top: `${y0 * 100}%`, bottom: `${(1 - y1) * 100}%` }}
    >
      {/* anuncio para lectores de pantalla, sin esperar la animación */}
      <p className="sr-only" aria-live="polite">
        Paso {indice + 1} de {TOTAL}: {DIAPOSITIVAS[indice].titulo}
      </p>
      {mostrar && !oculto && (
        <PapelRasgado
          key={visible}
          semilla={visible + 3}
          className="sale-del-crater pointer-events-auto flex max-h-full w-full max-w-[900px]"
          claseContenido="papel-scroll flex max-h-full w-full flex-col overflow-y-auto px-[clamp(1.6rem,3.2vw,3rem)] py-[clamp(1.4rem,2.6vw,2.4rem)]"
        >
        <article aria-labelledby="titulo-diapositiva" className="flex flex-col">
          <p className="text-[length:var(--texto-etiqueta)] font-bold uppercase tracking-[0.12em] text-[color:var(--arcilla-roja)]">
            {capitulo.nombre} · paso {visible + 1} de {TOTAL}
          </p>
          {visible === 0 ? null : (
            <h2
              id="titulo-diapositiva"
              className="mt-1 font-display text-[clamp(1.6rem,1rem+2vw,2.75rem)] font-extrabold leading-[1.02]"
            >
              {d.titulo}
            </h2>
          )}
          <ContenidoDiapositiva id={d.id} />
        </article>
        </PapelRasgado>
      )}
    </main>
  );
}
