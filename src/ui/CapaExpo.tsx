/*
 * Lo que la expo pone alrededor del papel, según el paso y la capa (contenidoExpo.tsx, EXTRAS_EXPO):
 * - el bocadillo de Rogelio, pegado a su cabeza, con la idea clave de la capa;
 * - notas satélite: papelitos con cinta entre el dino y el papel (o a los lados en vertical);
 * - etiquetas colgadas de asteroides que orbitan; los siguen mientras se mueven (en doses).
 * Aparece cuando termina la cinemática de llegada, como el papel. Solo en /expo.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { DIAPOSITIVAS, MODO } from "@/presentacion/diapositivas";
import { coreografiaDe } from "@/presentacion/coreografias";
import type { Disposicion } from "@/presentacion/disposicion";
import { ir, useCapa } from "@/presentacion/navegacion";
import { reiniciarExpo, useExpo } from "@/presentacion/estadoExpo";
import { EXTRAS_EXPO, type EtiquetaVista } from "@/presentacion/contenidoExpo";
import { pantalla } from "@/escena/pantalla";
import { cn } from "@/lib/utils";

type Props = { indice: number; disp: Disposicion; quieto: boolean; oculto: boolean };

/** Sigue un punto de la escena con un elemento, en cada cuadro, sin volver a renderizar React. */
function useSeguir(leer: () => { x: number; y: number } | null) {
  const ref = useRef<HTMLDivElement>(null);
  const leerRef = useRef(leer);
  leerRef.current = leer;
  useEffect(() => {
    let id = 0;
    const paso = () => {
      const p = leerRef.current();
      const el = ref.current;
      if (el && p) {
        el.style.left = `${(p.x * 100).toFixed(2)}%`;
        el.style.top = `${(p.y * 100).toFixed(2)}%`;
      }
      id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, []);
  return ref;
}

function Bocadillo({ texto, disp }: { texto: string; disp: Disposicion }) {
  const vertical = disp.modo === "vertical";
  const ref = useSeguir(() => {
    const c = pantalla.cabeza;
    // horizontal: encima de la cabeza, hacia la izquierda; vertical: a la derecha de la cabeza
    return vertical ? { x: c.x + 0.07, y: c.y + 0.015 } : { x: Math.max(0.012, c.x - 0.075), y: c.y - 0.06 };
  });
  return (
    <div ref={ref} className="pointer-events-none fixed z-[15]" style={{ transform: vertical ? "translateY(-50%)" : "translateY(-100%)" }}>
      <p
        key={texto}
        className="bocadillo-rogelio"
        style={{ maxWidth: vertical ? "min(38vw, 280px)" : "min(17vw, 250px)" }}
        role="status"
        aria-live="polite"
      >
        <span className="bocadillo-rogelio__nombre">Rogelio</span>
        {texto}
      </p>
    </div>
  );
}

/** De dónde cuelga una etiqueta: de un asteroide (su índice) o del techo, en un punto fijo. */
type Ancla = number | { x: number; y: number };

function Etiqueta({ ancla, vista }: { ancla: Ancla; vista: EtiquetaVista }) {
  const techo = typeof ancla !== "number";
  const ref = useSeguir(() => {
    if (techo) return { x: ancla.x, y: 0 };
    const p = pantalla.asteroides[ancla];
    return p ? { x: p.x, y: p.y } : null;
  });
  const carton = (
    <span className={cn("etiqueta-ast__carton", vista.tono && `etiqueta-ast__carton--${vista.tono}`, vista.tachada && "etiqueta-ast__carton--tachada")}>
      {vista.texto}
    </span>
  );
  return (
    <div ref={ref} className={cn("etiqueta-ast fixed z-[12]", techo && "etiqueta-ast--techo")}>
      <span className="etiqueta-ast__hilo" aria-hidden style={techo ? { height: `${ancla.y * 100}vh` } : undefined} />
      {vista.ir !== undefined ? (
        <button type="button" className="pointer-events-auto" onClick={() => ir(vista.ir!)} aria-label={`${vista.texto}: ir al paso ${vista.ir + 1}`}>
          {carton}
        </button>
      ) : (
        carton
      )}
    </div>
  );
}

/** Si no hay asteroides libres, las etiquetas cuelgan del techo: sobre el borde de arriba del papel. */
function puntosTecho(disp: Disposicion, cuantas: number): { x: number; y: number }[] {
  const { x0, x1, y0, y1 } = disp.panel;
  if (disp.modo === "vertical") return [0.16, 0.84, 0.3, 0.7].map((x, k) => ({ x, y: y1 + 0.05 + (k % 2) * 0.05 }));
  // huecos sobre el borde de arriba del papel (al menos 4), llenados alternados para que queden separados
  const n = Math.max(4, cuantas);
  const orden = [...Array.from({ length: n }, (_, k) => k).filter((k) => k % 2 === 0), ...Array.from({ length: n }, (_, k) => k).filter((k) => k % 2 === 1)];
  return orden.map((k) => ({ x: x0 + ((x1 - x0) * (k + 0.5)) / n, y: Math.max(0.03, y0 - 0.015) }));
}

/** Si un asteroide se ve bien para colgarle una etiqueta: en pantalla, fuera del papel y lejos del dino. */
function esLibre(i: number, activo: number, disp: Disposicion) {
  const { x0, x1, y0, y1 } = disp.panel;
  const p = pantalla.asteroides[i];
  if (!p || !p.delante || i === activo) return false;
  if (p.x < 0.05 || p.x > 0.95 || p.y < 0.1 || p.y > 0.86) return false;
  if (p.x > x0 - 0.03 && p.x < x1 + 0.03 && p.y > y0 - 0.03 && p.y < y1 + 0.03) return false; // el papel
  const c = pantalla.cabeza;
  if (Math.abs(p.x - c.x) < 0.1 && p.y > c.y - 0.12) return false; // el dino
  if (p.x < c.x + 0.14 && p.y > c.y - 0.3 && p.y < c.y) return false; // el bocadillo de Rogelio
  if (disp.modo === "horizontal" && p.x > x0 - 0.21) return false; // la columna de las notas satélite
  return true;
}

/** Un punto del techo que todavía no esté usado. */
function techoLibre(disp: Disposicion, usados: Ancla[], cuantas: number) {
  return puntosTecho(disp, cuantas).find((p) => !usados.some((u) => typeof u !== "number" && Math.abs(u.x - p.x) < 0.01));
}

/** Elige asteroides que se vean bien: libres y separados entre sí. */
function elegirAsteroides(cuantos: number, activo: number, disp: Disposicion, yaElegidos: number[]) {
  const libre = (i: number) => esLibre(i, activo, disp);
  const elegidos = yaElegidos.filter(libre);
  const candidatos = pantalla.asteroides
    .map((p, i) => ({ p, i }))
    .filter(({ i }) => libre(i) && !elegidos.includes(i))
    .sort((a, b) => a.p.y - b.p.y);
  for (const { p, i } of candidatos) {
    if (elegidos.length >= cuantos) break;
    const lejos = elegidos.every((j) => {
      const q = pantalla.asteroides[j];
      return Math.hypot(q.x - p.x, (q.y - p.y) * 0.6) > 0.09;
    });
    if (lejos) elegidos.push(i);
  }
  return elegidos.slice(0, cuantos);
}

export function CapaExpo({ indice, disp, quieto, oculto }: Props) {
  const capa = useCapa();
  const expo = useExpo();
  const [visible, setVisible] = useState<number | null>(indice);
  const [asignados, setAsignados] = useState<Ancla[]>([]);
  const asignadosRef = useRef<Ancla[]>([]);
  const previo = useRef(indice);

  // como el papel: al cambiar de paso desaparece y vuelve cuando termina la cinemática de llegada
  useEffect(() => {
    if (previo.current === indice) return;
    previo.current = indice;
    reiniciarExpo();
    setVisible(null);
    setAsignados([]);
    asignadosRef.current = [];
    const id = window.setTimeout(() => setVisible(indice), quieto ? 0 : coreografiaDe(indice).panel * 1000);
    return () => window.clearTimeout(id);
  }, [indice, quieto]);

  const extras = visible !== null ? EXTRAS_EXPO[DIAPOSITIVAS[visible]?.id] : undefined;
  const etiquetas = useMemo(
    () => (extras?.etiquetas ?? []).filter((g) => capa + 1 >= g.capa).flatMap((g) => g.items(expo)),
    [extras, capa, expo],
  );

  // a cuántos asteroides colgarles etiqueta (se conservan los ya elegidos al sumar capas)
  useEffect(() => {
    if (visible === null || etiquetas.length === 0) return;
    let intentos = 0;
    let id = 0;
    const intentar = () => {
      const ya = asignadosRef.current;
      if (ya.length >= etiquetas.length) return;
      // la escena todavía no dibuja: se espera
      if (pantalla.version === 0) {
        id = window.setTimeout(intentar, 400);
        return;
      }
      const deAsteroide = ya.filter((a): a is number => typeof a === "number");
      const libres = elegirAsteroides(etiquetas.length, visible, disp, deAsteroide).filter((i) => !ya.includes(i));
      // conserva las ya puestas; las nuevas van a asteroides libres y, si no alcanzan, al techo
      const nuevos: Ancla[] = [...ya];
      while (nuevos.length < etiquetas.length) {
        const siguiente = libres.shift() ?? techoLibre(disp, nuevos, etiquetas.length);
        if (siguiente === undefined) break;
        nuevos.push(siguiente);
      }
      asignadosRef.current = nuevos;
      setAsignados(nuevos);
      if (nuevos.length < etiquetas.length && ++intentos < 30) id = window.setTimeout(intentar, 500);
    };
    intentar();
    return () => window.clearTimeout(id);
  }, [visible, etiquetas.length, disp]);

  // los asteroides siguen orbitando: si uno con etiqueta se mete detrás del papel o cerca del dino,
  // su etiqueta pasa a otro asteroide libre (o al techo)
  useEffect(() => {
    if (visible === null) return;
    const id = window.setInterval(() => {
      const ya = asignadosRef.current;
      if (!ya.length || pantalla.version === 0) return;
      let cambio = false;
      const nuevos: Ancla[] = [];
      for (const a of ya) {
        if (typeof a !== "number" || esLibre(a, visible, disp)) {
          nuevos.push(a);
          continue;
        }
        cambio = true;
        const usados = [...nuevos, ...ya].filter((u): u is number => typeof u === "number");
        const otro = elegirAsteroides(usados.length + 1, visible, disp, usados).find((i) => !usados.includes(i));
        nuevos.push(otro ?? techoLibre(disp, [...nuevos, ...ya], ya.length) ?? a);
      }
      if (cambio) {
        asignadosRef.current = nuevos;
        setAsignados(nuevos);
      }
    }, 600);
    return () => window.clearInterval(id);
  }, [visible, disp]);

  if (MODO !== "expo" || oculto || visible === null || !extras) return null;

  const { x0, y1 } = disp.panel;
  const vertical = disp.modo === "vertical";
  const lugar = (donde: "arriba" | "abajo"): CSSProperties =>
    vertical
      ? // vertical: una nota a cada lado del dino, a distinta altura para no cruzarse con el bocadillo
        donde === "arriba"
        ? { top: `${(y1 + 0.015) * 100}%`, width: "min(40vw, 300px)", left: "3vw" }
        : { top: `${(y1 + 0.16) * 100}%`, width: "min(40vw, 300px)", right: "3vw" }
      : {
          top: donde === "arriba" ? "9vh" : "47vh",
          width: "min(17.5vw, 262px)",
          left: `calc(${x0 * 100}vw + 1vw - min(17.5vw, 262px))`,
        };

  const notas = (extras.notas ?? []).filter((n) => capa + 1 >= n.capa);
  return (
    <>
      <Bocadillo texto={extras.boca[Math.min(capa, extras.boca.length - 1)]} disp={disp} />

      {notas.map((n) => (
        <aside
          key={`${visible}-${n.titulo}`}
          className="nota-satelite fixed z-[15]"
          style={{ ...lugar(n.lugar), "--giro": `${n.giro ?? (n.lugar === "arriba" ? -2.5 : 2)}deg` } as CSSProperties}
          aria-label={n.titulo}
        >
          <p className="nota-satelite__titulo">{n.titulo}</p>
          {n.cuerpo()}
        </aside>
      ))}

      {etiquetas.map((vista, k) =>
        asignados[k] !== undefined ? <Etiqueta key={`${visible}-${k}`} ancla={asignados[k]} vista={vista} /> : null,
      )}
    </>
  );
}
