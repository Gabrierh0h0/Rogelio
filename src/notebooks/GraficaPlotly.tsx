/*
 * Gráficas interactivas de plotly guardadas en el notebook (las nubes 3D por clase): se giran y se acercan
 * con el mouse o el dedo. plotly.js se carga solo cuando aparece una, desde public/vendor (sirve sin internet).
 */
import { useEffect, useRef, useState } from "react";

export type FiguraPlotly = { data: unknown[]; layout?: Record<string, unknown> };

type Plotly = {
  newPlot: (div: HTMLElement, data: unknown[], layout: Record<string, unknown>, config: Record<string, unknown>) => Promise<unknown>;
  purge: (div: HTMLElement) => void;
};

let cargando: Promise<Plotly> | null = null;

function cargarPlotly(): Promise<Plotly> {
  const ya = (window as unknown as { Plotly?: Plotly }).Plotly;
  if (ya) return Promise.resolve(ya);
  cargando ??= new Promise<Plotly>((resolver, fallar) => {
    const s = document.createElement("script");
    s.src = `${import.meta.env.BASE_URL}vendor/plotly-3.5.0.min.js`;
    s.async = true;
    s.onload = () => resolver((window as unknown as { Plotly: Plotly }).Plotly);
    s.onerror = () => {
      cargando = null;
      fallar(new Error("No se pudo cargar plotly.js"));
    };
    document.head.appendChild(s);
  });
  return cargando;
}

export function GraficaPlotly({ figura }: { figura: FiguraPlotly }) {
  const ref = useRef<HTMLDivElement>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    const div = ref.current;
    if (!div) return;
    let vivo = true;
    let plotly: Plotly | null = null;
    cargarPlotly()
      .then((P) => {
        if (!vivo) return;
        plotly = P;
        // la rueda del mouse sigue bajando por el notebook; para acercar se usa el gesto o los botones de la gráfica
        return P.newPlot(div, figura.data, { ...figura.layout, paper_bgcolor: "rgba(0,0,0,0)" }, {
          responsive: true,
          displaylogo: false,
          scrollZoom: false,
        });
      })
      .catch(() => vivo && setFallo(true));
    return () => {
      vivo = false;
      plotly?.purge(div);
    };
  }, [figura]);

  if (fallo) return <pre className="nb-error">No se pudo cargar la gráfica 3D.</pre>;
  return <div ref={ref} className="nb-plotly" role="img" aria-label="Gráfica 3D interactiva" />;
}
