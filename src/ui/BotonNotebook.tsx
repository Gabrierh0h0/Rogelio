/*
 * Botón fijo arriba a la derecha: abre el notebook en la sección que respalda el paso actual
 * (el número va en la etiqueta). Al pasar el mouse empieza a bajar el visor y el notebook.
 */
import { NotebookText } from "lucide-react";
import { DIAPOSITIVAS } from "@/presentacion/diapositivas";
import { abrirNotebook } from "@/notebooks/estado";
import { destinoDePaso } from "@/notebooks/secciones";

export function BotonNotebook({ indice }: { indice: number }) {
  const destino = destinoDePaso(DIAPOSITIVAS[indice]?.id);
  const precargar = () => void import("@/notebooks/VisorNotebook").then((m) => m.precargar(destino.cual));
  return (
    <button
      type="button"
      onClick={() => abrirNotebook(destino)}
      onPointerEnter={precargar}
      onFocus={precargar}
      aria-label={`Abrir el notebook${destino.etiqueta ? ` en la sección ${destino.etiqueta}` : ""}`}
      className="boton-plastilina fixed right-3 top-3 z-30 flex h-11 items-center gap-2 bg-fieltro/85 pl-3 pr-2.5 text-crema"
    >
      <NotebookText aria-hidden className="size-5" />
      {/* en pantallas angostas (tablet de pie) solo ícono + sección, para no pisar el papel */}
      <span className="hidden font-display text-base font-semibold min-[900px]:inline">Notebook</span>
      {destino.etiqueta && (
        <span className="rounded-full bg-crema/90 px-2 py-0.5 text-xs font-extrabold tabular-nums text-tinta">{destino.etiqueta}</span>
      )}
    </button>
  );
}
