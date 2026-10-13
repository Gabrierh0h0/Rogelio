/*
 * Hoja de pergamino rasgada y arrugada (inspirada en papel viejo, no copiada).
 * - Bordes rasgados: un clip-path generado con semilla, con mordiscos grandes y fibras finas.
 * - "Hervor" de stop motion: tres versiones del borde que se alternan cada 2 cuadros.
 * - Una capa de borde más clara detrás (la fibra blanca del papel roto) y la hoja encima.
 * - Arrugas: textura SVG con relieve (feTurbulence + luz difusa), multiplicada sobre el color.
 */
import { useMemo, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

function azar(semilla: number) {
  let s = (semilla * 9301 + 49297) % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

type Punto = { x: number; y: number; dx: number; dy: number };

/** Recorre el borde del rectángulo y devuelve puntos con su "mordida" hacia adentro (px). */
function bordeBase(semilla: number, porLado = 26): Punto[] {
  const rnd = azar(semilla);
  const puntos: Punto[] = [];
  const mordida = () => {
    const base = 2 + rnd() * 7;
    return rnd() < 0.09 ? base + 8 + rnd() * 12 : base; // de vez en cuando, un pedazo arrancado
  };
  for (let i = 0; i < porLado; i++) puntos.push({ x: (i / porLado) * 100, y: 0, dx: 0, dy: mordida() });
  for (let i = 0; i < porLado; i++) puntos.push({ x: 100, y: (i / porLado) * 100, dx: -mordida(), dy: 0 });
  for (let i = 0; i < porLado; i++) puntos.push({ x: 100 - (i / porLado) * 100, y: 100, dx: 0, dy: -mordida() });
  for (let i = 0; i < porLado; i++) puntos.push({ x: 0, y: 100 - (i / porLado) * 100, dx: mordida(), dy: 0 });
  return puntos;
}

function poligono(puntos: Punto[], extra: number, variacion: () => number) {
  const partes = puntos.map((p) => {
    const v = variacion();
    const dx = p.dx === 0 ? v * 0.6 : Math.sign(p.dx) * (Math.abs(p.dx) + extra) + v;
    const dy = p.dy === 0 ? v * 0.6 : Math.sign(p.dy) * (Math.abs(p.dy) + extra) + v;
    return `calc(${p.x.toFixed(2)}% + ${dx.toFixed(1)}px) calc(${p.y.toFixed(2)}% + ${dy.toFixed(1)}px)`;
  });
  return `polygon(${partes.join(",")})`;
}

type Props = {
  semilla?: number;
  className?: string;
  /** clases del contenedor del contenido (padding, scroll) */
  claseContenido?: string;
  children: ReactNode;
  style?: CSSProperties;
};

export function PapelRasgado({ semilla = 1, className, claseContenido, children, style }: Props) {
  const variables = useMemo(() => {
    const base = bordeBase(semilla);
    const vars: Record<string, string> = {};
    ["a", "b", "c"].forEach((k, i) => {
      const rnd = azar(semilla * 7 + i + 1);
      vars[`--borde-${k}`] = poligono(base, 0, () => (rnd() - 0.5) * 2.4);
      const rnd2 = azar(semilla * 7 + i + 1);
      vars[`--hoja-${k}`] = poligono(base, 3, () => (rnd2() - 0.5) * 2.4);
    });
    return vars as CSSProperties;
  }, [semilla]);

  return (
    <div className={cn("papel-rasgado relative", className)} style={{ ...variables, ...style }}>
      <div className="papel-rasgado__fibra" aria-hidden />
      <div className="papel-rasgado__hoja" aria-hidden />
      <div className={cn("relative", claseContenido)}>{children}</div>
    </div>
  );
}
