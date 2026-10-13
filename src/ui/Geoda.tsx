/*
 * La geoda abierta: media geoda redonda (corteza de roca, anillos de ágata y una corona de
 * cristales) que salta del piso y gira hacia el público; la definición va en el hueco del centro.
 * El dibujo "hierve" entre 3 cuadros, como plastilina tocada entre fotos. Escape o tocar afuera
 * la cierra; el foco vuelve a donde estaba.
 */
import { useEffect, useMemo, useRef } from "react";
import { X } from "lucide-react";
import { GLOSARIO } from "@/presentacion/glosario";

/** Mismas paletas que el interior 3D (escena/geoda.ts): corteza, anillos, cristal y brillo. */
const PALETAS = [
  { corteza: "#5d5148", anillos: ["#b98e63", "#f4b860", "#ffe7a8"], cristal: "#e8743b", brillo: "#6fd3c4" },
  { corteza: "#5f5a52", anillos: ["#c9a46c", "#f2d27a", "#fff1c4"], cristal: "#d9608a", brillo: "#8fb8f0" },
  { corteza: "#4f5a48", anillos: ["#a3825a", "#e9a65a", "#fbdca0"], cristal: "#9a6fd1", brillo: "#7fd8a8" },
];

function azar(semilla: number) {
  let s = semilla * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Círculo chueco (en unidades del viewBox 0-100) como un rollito de plastilina aplastado. */
function contorno(r: number, rnd: () => number, puntos = 72, rugoso = 1) {
  const f = [rnd() * 6, rnd() * 6, rnd() * 6];
  let d = "";
  for (let i = 0; i < puntos; i++) {
    const a = (i / puntos) * Math.PI * 2;
    const k =
      1 + rugoso * (0.025 * Math.sin(a * 3 + f[0]) + 0.015 * Math.sin(a * 7 + f[1]) + 0.01 * Math.sin(a * 13 + f[2]));
    d += `${i ? "L" : "M"}${(50 + Math.cos(a) * r * k).toFixed(2)} ${(50 + Math.sin(a) * r * k).toFixed(2)}`;
  }
  return d + "Z";
}

function Dibujo({ variante, cuadro }: { variante: number; cuadro: number }) {
  const p = PALETAS[variante % PALETAS.length];
  const { corteza, poros, anillos, cristales, hueco, chispas } = useMemo(() => {
    const rnd = azar(variante * 7 + cuadro * 31 + 5);
    const n = 44;
    const pt = (ang: number, r: number) => `${(50 + Math.cos(ang) * r).toFixed(2)} ${(50 + Math.sin(ang) * r).toFixed(2)}`;
    return {
      corteza: contorno(48, rnd, 40, 1.6),
      poros: Array.from({ length: 22 }, () => {
        const a = rnd() * Math.PI * 2;
        const d = 44.5 + rnd() * 3.2;
        return { x: 50 + Math.cos(a) * d, y: 50 + Math.sin(a) * d, r: 0.5 + rnd() * 0.9 };
      }),
      anillos: [43.5, 40.5, 38].map((r) => contorno(r, rnd)),
      // corona de cristales en dos filas (largos atrás, cortos adelante); cada uno es un diente
      // con una cara clara y otra oscura, de tamaños y giros distintos
      cristales: [
        ...Array.from({ length: n }, (_, i) => ({ i, fila: 0 })),
        ...Array.from({ length: 34 }, (_, i) => ({ i, fila: 1 })),
      ].map(({ i, fila }) => {
        const total = fila ? 34 : n;
        const a = ((i + 0.5 * fila + rnd() * 0.45) / total) * Math.PI * 2;
        const ancho = ((Math.PI * 2) / total) * (fila ? 0.32 + rnd() * 0.18 : 0.5 + rnd() * 0.35);
        const base = fila ? 35 : 37.8;
        const punta = fila ? 31.5 + rnd() * 1.6 : 30 + rnd() * 4.5;
        const ladeo = (rnd() - 0.5) * ancho * 0.8;
        return {
          clara: `M${pt(a - ancho, base)}L${pt(a + ladeo, punta)}L${pt(a, base)}Z`,
          oscura: `M${pt(a, base)}L${pt(a + ladeo, punta)}L${pt(a + ancho, base)}Z`,
        };
      }),
      hueco: contorno(33.5, rnd),
      chispas: Array.from({ length: 9 }, () => {
        const a = rnd() * Math.PI * 2;
        const d = 32 + rnd() * 4;
        return { x: 50 + Math.cos(a) * d, y: 50 + Math.sin(a) * d, r: 0.4 + rnd() * 0.5 };
      }),
    };
  }, [variante, cuadro]);

  const id = `hueco-${variante}-${cuadro}`;
  return (
    <svg viewBox="0 0 100 100" className="geoda__cuadro absolute inset-0 size-full" aria-hidden>
      <defs>
        <radialGradient id={id} cx="45%" cy="40%" r="60%">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="0.72" stopColor="#fbf0d4" />
          <stop offset="1" stopColor={p.anillos[1]} />
        </radialGradient>
      </defs>
      {/* corteza: roca de plastilina con poros */}
      <path d={corteza} fill={p.corteza} />
      {poros.map((o, i) => (
        <circle key={i} cx={o.x} cy={o.y} r={o.r} fill="#000" opacity={0.28} />
      ))}
      {anillos.map((d, i) => (
        <path key={i} d={d} fill={p.anillos[i]} />
      ))}
      {cristales.map((c, i) => (
        <g key={i}>
          <path d={c.clara} fill={p.brillo} />
          <path d={c.oscura} fill={p.cristal} />
        </g>
      ))}
      <path d={hueco} fill={`url(#${id})`} />
      {chispas.map((o, i) => (
        <circle key={i} cx={o.x} cy={o.y} r={o.r} fill="#fff" opacity={0.85} />
      ))}
    </svg>
  );
}

type Props = { abierto: number | null; onCerrar: () => void };

export function Geoda({ abierto, onCerrar }: Props) {
  const cerrar = useRef<HTMLButtonElement>(null);
  const previo = useRef<Element | null>(null);

  useEffect(() => {
    if (abierto === null) return;
    previo.current = document.activeElement;
    cerrar.current?.focus();
    return () => (previo.current as HTMLElement | null)?.focus?.();
  }, [abierto]);

  if (abierto === null) return null;
  const e = GLOSARIO[abierto];
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[oklch(0.1_0.03_215/0.55)] p-3" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-geoda"
        className="geoda relative aspect-square w-[min(94vmin,620px)]"
        onClick={(ev) => ev.stopPropagation()}
        onKeyDown={(ev) => {
          if (ev.key === "Escape") onCerrar();
          if (ev.key === "Tab") {
            ev.preventDefault(); // único control del diálogo: el foco se queda en "cerrar"
            cerrar.current?.focus();
          }
        }}
      >
        {[0, 1, 2].map((c) => (
          <Dibujo key={c} variante={abierto % 3} cuadro={c} />
        ))}

        {/* la definición, en el hueco de la geoda */}
        <div className="papel-scroll absolute inset-[18%] flex flex-col items-center justify-center overflow-y-auto text-center text-tinta [container-type:inline-size]">
          <p className="text-[length:clamp(0.7rem,3.4cqi,0.85rem)] font-bold uppercase tracking-[0.12em] text-[color:var(--arcilla-roja)]">
            Geoda
          </p>
          <h2 id="titulo-geoda" className="mt-1 font-display text-[length:clamp(1.3rem,8.5cqi,2.2rem)] font-extrabold leading-[1.05]">
            {e.termino}
          </h2>
          <p className="mt-2.5 text-[length:clamp(0.8rem,4.6cqi,1.02rem)] leading-snug text-[color:var(--tinta-suave)]">{e.texto}</p>
          {e.formula && (
            <p className="mt-2.5 font-display text-[length:clamp(0.95rem,5.6cqi,1.3rem)] font-semibold tracking-wide">{e.formula}</p>
          )}
        </div>

        <button
          ref={cerrar}
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar geoda"
          className="boton-plastilina absolute right-[6%] top-[6%] grid size-12 place-items-center bg-papel text-tinta"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>
    </div>
  );
}
