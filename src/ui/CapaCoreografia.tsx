/*
 * Efectos de pantalla (DOM) de algunas cinemáticas de llegada, encima de la escena y antes de
 * que salga el papel. Cada uno dura lo que tarda su cinemática (presentacion/coreografias.ts)
 * y se desmonta solo. No aparecen en la primera carga ni con "reducir movimiento".
 * - telescopio: iris oscuro con aro de bronce que se abre sobre el asteroide.
 * - perilla: medidor de plastilina; la aguja baja de 0.5 al umbral calibrado.
 * - calendario: un calendario de mesa pasa las hojas hasta el presente y abre un remolino.
 * - folds: la etiqueta del fold de prueba, de 1 a 5.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { graficasJpl } from "@/data/resultados";
import { cinematicaDe, coreografiaDe } from "@/presentacion/coreografias";
import type { Disposicion } from "@/presentacion/disposicion";
import { evalB } from "@/presentacion/piezas";

type Props = { indice: number; disp: Disposicion; quieto: boolean; oculto: boolean };

const cuadros = (n: number) => `calc(var(--cuadro) * ${n})`;

/** Punto del arco del medidor para un valor 0..1 (0 a la izquierda, 1 a la derecha). */
function enArco(v: number, r: number) {
  const a = Math.PI * (1 - v);
  return `${(Math.cos(a) * r).toFixed(2)} ${(-Math.sin(a) * r).toFixed(2)}`;
}

function Perilla() {
  const umbral = evalB.umbral;
  const angulo = (v: number) => -90 + 180 * v;
  const marcas = Array.from({ length: 11 }, (_, i) => i / 10);
  return (
    <div className="coreo-aparece flex flex-col items-center">
      <svg viewBox="-120 -124 240 146" className="w-[min(46vmin,340px)] drop-shadow-[0_10px_0_oklch(0.1_0.03_215/0.45)]" aria-hidden>
        <path d={`M ${enArco(0, 104)} A 104 104 0 0 1 ${enArco(1, 104)} L ${enArco(1, 84)} A 84 84 0 0 0 ${enArco(0, 84)} Z`} fill="#e8d6ae" stroke="#7a5a33" strokeWidth="5" strokeLinejoin="round" />
        {/* lo que se gana al bajar el umbral: más asteroides se marcan como peligrosos */}
        <path d={`M ${enArco(umbral, 102)} A 102 102 0 0 1 ${enArco(0.5, 102)} L ${enArco(0.5, 86)} A 86 86 0 0 0 ${enArco(umbral, 86)} Z`} fill="#f2c14e" />
        {marcas.map((m, i) => (
          <path key={m} d={`M ${enArco(m, 84)} L ${enArco(m, i % 5 === 0 ? 70 : 76)}`} stroke="#5c4a36" strokeWidth="3" strokeLinecap="round" />
        ))}
        <text x="-96" y="18" fontSize="14" fontWeight="700" fill="#5c4a36" textAnchor="middle">0</text>
        <text x="0" y="-110" fontSize="14" fontWeight="700" fill="#5c4a36" textAnchor="middle">0.5</text>
        <text x="96" y="18" fontSize="14" fontWeight="700" fill="#5c4a36" textAnchor="middle">1</text>
        <g className="coreo-aguja" style={{ "--desde": `${angulo(0.5)}deg`, "--hasta": `${angulo(umbral)}deg` } as CSSProperties}>
          <path d="M -5 0 L 0 -92 L 5 0 Z" fill="#b0442c" stroke="#6b2414" strokeWidth="2" strokeLinejoin="round" />
        </g>
        <circle r="13" fill="#7a5a33" stroke="#4a3520" strokeWidth="3" />
      </svg>
      <p className="papel mt-2 px-4 py-1.5 font-display text-xl font-extrabold">
        umbral{" "}
        <span className="relative inline-block min-w-[3ch] text-[color:var(--arcilla-roja)]">
          <span className="coreo-cambia__antes">0.50</span>
          <span className="coreo-cambia__despues absolute inset-0">{umbral.toFixed(2)}</span>
        </span>
      </p>
    </div>
  );
}


function Calendario() {
  const anios: number[] = [];
  for (let a = graficasJpl.anio_corte - 1; a <= graficasJpl.anio_actual; a++) anios.push(a);
  const espiral = Array.from({ length: 120 }, (_, i) => {
    const a = i * 0.18;
    const r = 4 + i * 0.78;
    return `${i ? "L" : "M"} ${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`;
  }).join(" ");
  return (
    <div className="relative grid place-items-center">
      {/* remolino del portal, detrás */}
      <svg viewBox="-100 -100 200 200" className="coreo-remolino absolute w-[min(60vmin,440px)]" aria-hidden>
        <path d={espiral} fill="none" stroke="#7fd8c4" strokeWidth="7" strokeLinecap="round" opacity="0.75" />
      </svg>
      {/* cuando se abre el remolino, el calendario se aparta para dejar pasar al asteroide */}
      <div className="coreo-se-aparta relative">
      <div className="coreo-aparece coreo-calendario papel relative w-[min(38vmin,290px)] px-5 pb-5 pt-7 text-center">
        <span className="absolute inset-x-6 top-2 flex justify-between" aria-hidden>
          <span className="size-3 rounded-full bg-[color:var(--tinta)] opacity-70" />
          <span className="size-3 rounded-full bg-[color:var(--tinta)] opacity-70" />
        </span>
        <p className="text-[length:var(--texto-etiqueta)] font-bold uppercase tracking-[0.12em] text-[color:var(--arcilla-roja)]">
          descubiertos en
        </p>
        <div className="relative mt-1 h-[1.05em] font-display text-[clamp(2.4rem,1.6rem+3vw,4rem)] font-extrabold leading-none">
          {anios.map((a, i) => (
            <span
              key={a}
              className={i === anios.length - 1 ? "coreo-hoja coreo-hoja--ultima absolute inset-0" : "coreo-hoja absolute inset-0"}
              style={{ animationDelay: cuadros(2 + i * 2.5) }}
            >
              {a}
            </span>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}

function Folds() {
  return (
    <p className="papel coreo-aparece px-4 py-2 font-display text-lg font-extrabold">
      validación cruzada · fold de prueba{" "}
      <span className="relative inline-block min-w-[3ch] text-[color:var(--arcilla-roja)]">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={n === 5 ? "coreo-hoja coreo-hoja--ultima absolute inset-0" : "coreo-hoja absolute inset-0"}
            style={{ animationDelay: cuadros(12 + (n - 1) * 3) }}
          >
            {n}/5
          </span>
        ))}
        <span className="invisible">5/5</span>
      </span>
    </p>
  );
}

export function CapaCoreografia({ indice, disp, quieto, oculto }: Props) {
  const [activo, setActivo] = useState<number | null>(null);
  const previo = useRef(indice);

  useEffect(() => {
    // solo al cambiar de paso (no en la primera carga, ni dos veces en modo estricto)
    if (previo.current === indice) return;
    previo.current = indice;
    if (quieto) return;
    setActivo(indice);
    // solo en desarrollo: con la cinemática congelada (window.__coreoS) el efecto no se desmonta
    if (import.meta.env.DEV && typeof (window as unknown as { __coreoS?: number }).__coreoS === "number") return;
    // se va justo cuando sale el papel (va por encima de él)
    const id = window.setTimeout(() => setActivo(null), (coreografiaDe(indice).panel - 0.04) * 1000);
    return () => window.clearTimeout(id);
  }, [indice, quieto]);

  if (activo === null || oculto) return null;
  const nombre = cinematicaDe(activo);
  const { x0, x1, y0, y1 } = disp.panel;

  if (nombre === "telescopio") {
    const centro = { "--cx": `${((x0 + x1) / 2) * 100}%`, "--cy": `${((y0 + y1) / 2) * 100}%` } as CSSProperties;
    return <div key={activo} className="coreo-iris pointer-events-none fixed inset-0 z-20" style={centro} aria-hidden />;
  }

  const contenido =
    nombre === "perilla" ? <Perilla /> : nombre === "calendario" ? <Calendario /> : nombre === "folds" ? <Folds /> : null;
  if (!contenido) return null;
  return (
    <div
      key={activo}
      className={`coreo-capa coreo-capa--${nombre} pointer-events-none fixed z-20 flex justify-center pb-4`}
      style={{
        left: `${x0 * 100}%`,
        right: `${(1 - x1) * 100}%`,
        top: `${y0 * 100}%`,
        bottom: `${(1 - y1) * 100}%`,
        alignItems: nombre === "folds" ? "flex-end" : "center",
      }}
      aria-hidden
    >
      {contenido}
    </div>
  );
}
