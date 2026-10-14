/*
 * Visor de notebooks para presentar: se abre encima de la presentación con el botón "Notebook"
 * (arriba a la derecha) y "Volver" o Escape regresa al mismo paso. Muestra el .ipynb ejecutado:
 * textos, código coloreado y salidas. Índice lateral con las secciones, ← → para saltar entre
 * secciones, letra más grande o más pequeña y un interruptor para ocultar el código.
 */
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowLeft, Code2, ListTree, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrefiereMenosMovimiento } from "@/lib/movimiento";
import { abrirNotebook, cerrarNotebook, useVisor } from "./estado";
import { NOTEBOOKS, type CualNotebook } from "./secciones";
import { cargarNotebook, type CeldaVista, type NotebookVista, type SalidaVista } from "./leer";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.min.css";
import "./visor.css";

/** Para el botón: empieza a bajar el notebook antes del clic. */
export const precargar = (cual: CualNotebook) => void cargarNotebook(cual).catch(() => {});

const ESCALAS = [0.85, 0.95, 1, 1.1, 1.2, 1.35, 1.5];

function leerPreferencia<T>(clave: string, inicial: T): T {
  try {
    const v = localStorage.getItem(clave);
    return v === null ? inicial : (JSON.parse(v) as T);
  } catch {
    return inicial;
  }
}
function guardarPreferencia(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento: solo no se recuerda */
  }
}

function Salida({ s, n }: { s: SalidaVista; n: number | null }) {
  if (s.tipo === "imagen") return <img className="nb-imagen" src={s.src} alt={`Gráfica de la celda [${n ?? ""}]`} />;
  if (s.tipo === "html") return <div className="nb-html" dangerouslySetInnerHTML={{ __html: s.html }} />;
  return <pre className={s.tipo === "error" ? "nb-error" : "nb-texto"}>{s.texto}</pre>;
}

function Celda({ c, sinCodigo }: { c: CeldaVista; sinCodigo: boolean }) {
  if (c.tipo === "markdown") return <div className="nb-md" dangerouslySetInnerHTML={{ __html: c.html }} />;
  if (sinCodigo && c.salidas.length === 0) return null;
  return (
    <section className="nb-celda">
      {!sinCodigo && (
        <div className="nb-entrada">
          <span className="nb-n" aria-label={c.n ? `Celda ${c.n}` : undefined}>
            [{c.n ?? " "}]
          </span>
          <pre className="nb-codigo">
            <code className="hljs language-python" dangerouslySetInnerHTML={{ __html: c.html }} />
          </pre>
        </div>
      )}
      {c.salidas.length > 0 && (
        <div className="nb-salidas">
          {c.salidas.map((s, i) => (
            <Salida key={i} s={s} n={c.n} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function VisorNotebook() {
  const visor = useVisor();
  const quieto = usePrefiereMenosMovimiento();
  const [datos, setDatos] = useState<{ cual: CualNotebook; nb: NotebookVista } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sinCodigo, setSinCodigo] = useState(() => leerPreferencia("nb-sin-codigo", false));
  const [escala, setEscala] = useState(() => leerPreferencia("nb-escala", 1));
  const [indiceVisible, setIndiceVisible] = useState(() => window.matchMedia("(min-width: 900px)").matches);
  const [activa, setActiva] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const indiceRef = useRef<HTMLElement>(null);

  const cual = visor.abierto ? visor.cual : "principal";
  const ancla = visor.abierto ? visor.ancla : undefined;
  const vez = visor.abierto ? visor.vez : 0;
  const listo = datos?.cual === cual ? datos.nb : null;

  // cargar el notebook pedido (si ya se bajó, sale de la memoria al instante)
  useEffect(() => {
    let vivo = true;
    setError(null);
    cargarNotebook(cual)
      .then((nb) => vivo && setDatos((d) => (d?.cual === cual && d.nb === nb ? d : { cual, nb })))
      .catch((e: Error) => vivo && setError(e.message));
    return () => {
      vivo = false;
    };
  }, [cual, vez]);

  const irA = useCallback(
    (id: string | null, suave = true) => {
      const caja = scroller.current;
      if (!caja) return;
      const destino = id ? caja.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`) : null;
      const top = destino ? destino.getBoundingClientRect().top - caja.getBoundingClientRect().top + caja.scrollTop - 16 : 0;
      caja.scrollTo({ top, behavior: suave && !quieto ? "smooth" : "auto" });
    },
    [quieto],
  );

  // al abrir (o al pedir otra sección) saltar al ancla; se repite cuando terminan de decodificarse las gráficas
  useEffect(() => {
    if (!listo) return;
    irA(ancla ?? null, false);
    const imgs = [...(scroller.current?.querySelectorAll("img") ?? [])];
    let vivo = true;
    Promise.all(imgs.map((i) => i.decode().catch(() => {}))).then(() => vivo && irA(ancla ?? null, false));
    return () => {
      vivo = false;
    };
  }, [listo, ancla, vez, irA]);

  // sección actual (para el índice) según el scroll
  useEffect(() => {
    const caja = scroller.current;
    if (!caja || !listo) return;
    let cuadro = 0;
    const medir = () => {
      cuadro = 0;
      // un título cuenta como "actual" cuando llega cerca del borde de arriba (los saltos lo dejan a 16 px)
      const borde = caja.getBoundingClientRect().top + 40;
      let actual: string | null = null;
      for (const s of listo.secciones) {
        const el = caja.querySelector(`[id="${CSS.escape(s.id)}"]`);
        if (el && el.getBoundingClientRect().top <= borde) actual = s.id;
        else if (el) break;
      }
      setActiva(actual);
    };
    const alMover = () => {
      if (!cuadro) cuadro = requestAnimationFrame(medir);
    };
    medir();
    caja.addEventListener("scroll", alMover, { passive: true });
    return () => {
      caja.removeEventListener("scroll", alMover);
      cancelAnimationFrame(cuadro);
    };
  }, [listo]);

  // el índice sigue a la sección actual
  useEffect(() => {
    if (!activa) return;
    indiceRef.current?.querySelector(`[data-id="${CSS.escape(activa)}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activa]);

  // teclado: Escape vuelve; ← → saltan de sección
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cerrarNotebook();
        return;
      }
      if (!listo || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) return;
      e.preventDefault();
      const ids = listo.secciones.map((s) => s.id);
      const k = activa ? ids.indexOf(activa) : -1;
      const sig = e.key === "ArrowRight" ? Math.min(ids.length - 1, k + 1) : k - 1;
      irA(sig < 0 ? null : ids[sig]);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [listo, activa, irA]);

  // foco: entra al documento al abrir y vuelve a donde estaba al cerrar
  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    scroller.current?.focus({ preventScroll: true });
    return () => previo?.focus?.({ preventScroll: true });
  }, []);

  // los enlaces internos del notebook (#s3-5) se mueven dentro del visor, sin tocar el # de la presentación
  const alClic = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest("a");
    const href = a?.getAttribute("href");
    if (!a || !href) return;
    e.preventDefault();
    if (href.startsWith("#")) irA(href.slice(1));
    else if (/^https?:/.test(href)) window.open(href, "_blank", "noopener");
  };

  const cambiarEscala = (paso: number) => {
    const k = ESCALAS.indexOf(escala);
    const nueva = ESCALAS[Math.max(0, Math.min(ESCALAS.length - 1, (k < 0 ? 2 : k) + paso))];
    setEscala(nueva);
    guardarPreferencia("nb-escala", nueva);
  };

  return (
    <div className="nb-visor" role="dialog" aria-modal="true" aria-label={`Notebook ${NOTEBOOKS[cual].archivo}`}>
      <header className="nb-barra">
        <button
          type="button"
          className="nb-boton nb-boton--icono"
          aria-pressed={indiceVisible}
          aria-label={indiceVisible ? "Ocultar índice" : "Mostrar índice"}
          onClick={() => setIndiceVisible((v) => !v)}
        >
          <ListTree aria-hidden className="size-5" />
        </button>
        <div className="nb-pestanas" role="tablist" aria-label="Notebooks">
          {(Object.keys(NOTEBOOKS) as CualNotebook[]).map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={c === cual}
              className={cn("nb-pestana", c === cual && "nb-pestana--activa")}
              onClick={() => c !== cual && abrirNotebook({ cual: c })}
            >
              <span>{NOTEBOOKS[c].titulo}</span>
              <small>{NOTEBOOKS[c].archivo}</small>
            </button>
          ))}
        </div>
        <div className="nb-acciones">
          <button
            type="button"
            className="nb-boton"
            aria-pressed={sinCodigo}
            onClick={() => {
              setSinCodigo(!sinCodigo);
              guardarPreferencia("nb-sin-codigo", !sinCodigo);
            }}
          >
            <Code2 aria-hidden className="size-4" />
            {sinCodigo ? "Mostrar código" : "Ocultar código"}
          </button>
          <div className="nb-zoom" role="group" aria-label="Tamaño de letra">
            <button type="button" className="nb-boton nb-boton--icono" aria-label="Letra más pequeña" onClick={() => cambiarEscala(-1)} disabled={escala <= ESCALAS[0]}>
              <Minus aria-hidden className="size-4" />
            </button>
            <span aria-live="polite">{Math.round(escala * 100)}%</span>
            <button type="button" className="nb-boton nb-boton--icono" aria-label="Letra más grande" onClick={() => cambiarEscala(1)} disabled={escala >= ESCALAS[ESCALAS.length - 1]}>
              <Plus aria-hidden className="size-4" />
            </button>
          </div>
          <button type="button" className="nb-boton nb-boton--volver" onClick={cerrarNotebook}>
            <ArrowLeft aria-hidden className="size-4" />
            Volver a la presentación
            <kbd>Esc</kbd>
          </button>
        </div>
      </header>

      <div className="nb-cuerpo">
        {indiceVisible && (
          <nav ref={indiceRef} className="nb-indice" aria-label="Secciones del notebook">
            <button type="button" className={cn("nb-indice__item nb-indice__item--2", !activa && "nb-indice__item--activo")} onClick={() => irA(null)}>
              Inicio
            </button>
            {listo?.secciones.map((s) => (
              <button
                key={s.id}
                type="button"
                data-id={s.id}
                aria-current={activa === s.id ? "location" : undefined}
                className={cn("nb-indice__item", `nb-indice__item--${s.nivel}`, activa === s.id && "nb-indice__item--activo")}
                onClick={() => {
                  irA(s.id);
                  if (!window.matchMedia("(min-width: 900px)").matches) setIndiceVisible(false);
                }}
              >
                {s.titulo}
              </button>
            ))}
            <p className="nb-indice__ayuda">
              <kbd>←</kbd> <kbd>→</kbd> sección anterior / siguiente
            </p>
          </nav>
        )}

        <div ref={scroller} className="nb-scroll" tabIndex={-1} style={{ fontSize: `${escala}em` }}>
          {error ? (
            <p className="nb-estado">
              {error}.{" "}
              <button type="button" className="nb-boton" onClick={() => abrirNotebook({ cual })}>
                Reintentar
              </button>
            </p>
          ) : !listo ? (
            <p className="nb-estado" role="status">
              Abriendo {NOTEBOOKS[cual].archivo}…
            </p>
          ) : (
            <article className="nb-doc" onClick={alClic}>
              {listo.celdas.map((c, i) => (
                <Celda key={i} c={c} sinCodigo={sinCodigo} />
              ))}
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
