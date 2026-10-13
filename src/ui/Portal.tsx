/*
 * Portada de la app (ruta /): elegir entre la expo de clase (/expo) y el proyecto completo
 * (/proyecto). Sin 3D, para que cargue al instante: el dino es una foto del render de Blender
 * que "respira" en doses, y estrellas de cartón colgadas de hilos.
 */
import { ArrowRight } from "lucide-react";
import { EQUIPO } from "@/presentacion/equipo";
import { PapelRasgado } from "./Papel";

const ESTRELLAS = [
  { x: "8%", hilo: "18vh", tam: 26, retraso: 0 },
  { x: "21%", hilo: "34vh", tam: 18, retraso: -2 },
  { x: "47%", hilo: "10vh", tam: 22, retraso: -4 },
  { x: "71%", hilo: "6vh", tam: 16, retraso: -1 },
  { x: "88%", hilo: "22vh", tam: 28, retraso: -3 },
];

function Estrella({ tam }: { tam: number }) {
  const puntos = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 1 : 0.46;
    return `${(50 + Math.cos(a) * r * 48).toFixed(1)},${(50 + Math.sin(a) * r * 48).toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" width={tam} height={tam} aria-hidden>
      <polygon points={puntos} fill="#e8c46a" stroke="#a8812f" strokeWidth="5" strokeLinejoin="round" />
    </svg>
  );
}

function Opcion({ href, titulo, detalle, principal }: { href: string; titulo: string; detalle: string; principal?: boolean }) {
  return (
    <a
      href={href}
      className={`boton-plastilina group flex min-h-16 items-center justify-between gap-4 px-6 py-3 ${
        principal ? "bg-[color:var(--arcilla-roja)] text-crema" : "bg-fieltro text-crema"
      }`}
    >
      <span className="flex flex-col text-left">
        <span className="font-display text-[clamp(1.25rem,1rem+0.8vw,1.6rem)] font-extrabold leading-tight">{titulo}</span>
        <span className="text-sm font-semibold opacity-85">{detalle}</span>
      </span>
      <ArrowRight aria-hidden className="size-6 shrink-0 transition-transform group-hover:translate-x-1" />
    </a>
  );
}

export function Portal() {
  return (
    <main className="relative min-h-full overflow-hidden">
      <div className="fondo-set" aria-hidden />

      {/* estrellas de cartón colgadas */}
      {ESTRELLAS.map((e, i) => (
        <div key={i} className="portal-estrella pointer-events-none absolute top-0" style={{ left: e.x, animationDelay: `calc(var(--cuadro) * ${e.retraso})` }} aria-hidden>
          <div className="mx-auto w-px bg-[oklch(0.86_0.02_85/0.45)]" style={{ height: e.hilo }} />
          <div className="-mt-1 flex justify-center">
            <Estrella tam={e.tam} />
          </div>
        </div>
      ))}

      <div className="relative z-10 mx-auto grid min-h-dvh max-w-6xl items-center gap-6 px-4 py-10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-10 md:px-8">
        <img
          src="/dino-portada.webp"
          alt="El dino de plastilina, naranja y de ojos verdes, con las manos juntas"
          width={532}
          height={900}
          className="portal-dino mx-auto h-[30vh] w-auto drop-shadow-[0_18px_24px_oklch(0.08_0.03_215/0.6)] md:h-[min(72vh,620px)]"
        />

        <PapelRasgado semilla={12} className="sale-del-crater" claseContenido="px-7 py-8 md:px-10 md:py-10">
          <p className="text-[length:var(--texto-etiqueta)] font-bold uppercase tracking-[0.12em] text-[color:var(--arcilla-roja)]">
            Introducción a la Inteligencia Artificial · 6.º semestre
          </p>
          <h1 className="mt-2 font-display text-[clamp(2.2rem,1.3rem+3.6vw,4.4rem)] font-extrabold leading-[0.95]">
            ¿Nos va a caer un asteroide?
          </h1>
          <p className="mt-4 max-w-[46ch] text-lg leading-relaxed text-[color:var(--tinta-suave)]">
            Un modelo de machine learning que detecta asteroides potencialmente peligrosos, con datos de la NASA y del
            catálogo de JPL.
          </p>

          <nav aria-label="Elegir presentación" className="mt-7 flex flex-col gap-3">
            <Opcion href="/expo" titulo="La exposición" detalle="11 pasos · unos 10 minutos" principal />
            <Opcion href="/proyecto" titulo="El proyecto completo" detalle="30 pasos · todo el detalle" />
          </nav>

          <div className="mt-7">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-[color:var(--arcilla-roja)]">Equipo</p>
            <ul className="mt-1.5 grid gap-x-6 gap-y-0.5 text-sm leading-snug sm:grid-cols-2">
              {EQUIPO.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        </PapelRasgado>
      </div>

      <div className="vineta" aria-hidden />
      <div className="grano" aria-hidden />
    </main>
  );
}
