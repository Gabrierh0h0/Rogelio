/*
 * La presentación: fondo del set (CSS) + escena 3D (carga diferida) + interfaz DOM.
 * Navegación: flechas / AvPág / RePág / espacio / Inicio / Fin, botones, piedritas de
 * avance, tocar un asteroide, o deslizar el dedo en tablet.
 */
import { House } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { DIAPOSITIVAS, TOTAL } from "@/presentacion/diapositivas";
import { disposicion } from "@/presentacion/disposicion";
import { GLOSARIO } from "@/presentacion/glosario";
import { anterior, ir, siguiente, useIndice } from "@/presentacion/navegacion";
import { usePrefiereMenosMovimiento } from "@/lib/movimiento";
import { Panel } from "@/ui/Panel";
import { Controles } from "@/ui/Controles";
import { Geoda } from "@/ui/Geoda";
import { FiltrosPlastilina } from "@/graficas/Graficas";
import { CapaCinematica, useCinematica } from "@/ui/Cinematica";
import { CapaCoreografia } from "@/ui/CapaCoreografia";

const Escena = lazy(() => import("@/escena/Escena"));

function useVentana() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("resize", cb);
      return () => window.removeEventListener("resize", cb);
    },
    () => `${window.innerWidth}x${window.innerHeight}`,
  );
}

type Sobre = { i: number; x: number; y: number } | null;

export default function App() {
  const indice = useIndice();
  const quieto = usePrefiereMenosMovimiento();
  const ventana = useVentana();
  const disp = useMemo(() => {
    const [w, h] = ventana.split("x").map(Number);
    return disposicion(w, h);
  }, [ventana]);
  const [listo, setListo] = useState(false);
  const [geoda, setGeoda] = useState<number | null>(null);
  const [sobre, setSobre] = useState<Sobre>(null);
  const { fase, iniciar } = useCinematica(indice, quieto);

  const onSobre = useCallback((i: number | null, x: number, y: number) => setSobre(i === null ? null : { i, x, y }), []);
  const onListo = useCallback(() => setListo(true), []);

  // teclado
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (geoda !== null) return; // el diálogo maneja su propio teclado
      const enControl = e.target instanceof HTMLElement && e.target.closest("button, a, input, textarea, select");
      if (["ArrowRight", "PageDown"].includes(e.key) || (e.key === " " && !enControl)) {
        e.preventDefault();
        siguiente();
      } else if (["ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        anterior();
      } else if (e.key === "Home") ir(0);
      else if (e.key === "End") ir(TOTAL - 1);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [geoda]);

  // deslizar con el dedo (solo táctil: con mouse se arrastra texto normal)
  useEffect(() => {
    let inicio: { x: number; y: number; t: number } | null = null;
    const baja = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") inicio = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    const sube = (e: PointerEvent) => {
      if (!inicio || geoda !== null) return;
      const dx = e.clientX - inicio.x;
      const dy = e.clientY - inicio.y;
      const rapido = performance.now() - inicio.t < 700;
      inicio = null;
      if (rapido && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) (dx < 0 ? siguiente : anterior)();
    };
    window.addEventListener("pointerdown", baja);
    window.addEventListener("pointerup", sube);
    return () => {
      window.removeEventListener("pointerdown", baja);
      window.removeEventListener("pointerup", sube);
    };
  }, [geoda]);

  return (
    <div className="relative h-full overflow-hidden">
      <div className="fondo-set" aria-hidden />
      <FiltrosPlastilina />

      <Suspense fallback={null}>
        <Escena
          indice={indice}
          quieto={quieto}
          onElegir={ir}
          onSobre={onSobre}
          onGeoda={setGeoda}
          geoda={geoda}
          onListo={onListo}
          fase={fase}
        />
      </Suspense>

      <div className="vineta" aria-hidden />

      <Panel indice={indice} disp={disp} quieto={quieto} oculto={fase !== "inactiva"} />
      <CapaCoreografia indice={indice} disp={disp} quieto={quieto} oculto={fase !== "inactiva"} />
      <CapaCinematica fase={fase} disp={disp} onRepetir={iniciar} />
      <Controles indice={indice} disp={disp} />

      {/* volver a la portada (elegir expo o proyecto completo) */}
      <a
        href="/"
        aria-label="Volver a la portada"
        className="boton-plastilina fixed left-3 top-3 z-30 grid size-11 place-items-center bg-fieltro/85 text-crema"
      >
        <House aria-hidden className="size-5" />
      </a>

      {/* acceso por teclado a las geodas del piso (en 3D solo se tocan) */}
      <nav aria-label="Glosario" className="fixed left-16 top-3 z-30 flex gap-2">
        {GLOSARIO.map((e, i) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setGeoda(i)}
            className="boton-plastilina sr-only bg-papel px-3 py-2 text-sm font-bold text-tinta focus:not-sr-only"
          >
            Geoda: {e.termino}
          </button>
        ))}
      </nav>

      {sobre && (
        <p
          className="papel pointer-events-none fixed z-30 px-3 py-1.5 text-sm font-bold"
          style={{ left: sobre.x + 16, top: sobre.y + 16 }}
          aria-hidden
        >
          Paso {sobre.i + 1} · {DIAPOSITIVAS[sobre.i].titulo}
        </p>
      )}

      <Geoda abierto={geoda} onCerrar={() => setGeoda(null)} />

      {!listo && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-noche" role="status">
          <p className="cargando font-display text-3xl font-extrabold text-crema">Amasando plastilina</p>
        </div>
      )}

      <div className="grano" aria-hidden />
    </div>
  );
}
