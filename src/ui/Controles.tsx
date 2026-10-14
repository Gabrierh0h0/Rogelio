/*
 * Barra de navegación: anterior / siguiente, contador y avance por capítulo.
 * Cada piedrita es un paso (se puede saltar); se agrupan por capítulo.
 */
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CAPITULOS, DIAPOSITIVAS, TOTAL } from "@/presentacion/diapositivas";
import type { Disposicion } from "@/presentacion/disposicion";
import { anterior, capasDe, ir, siguiente, useCapa } from "@/presentacion/navegacion";
import { cn } from "@/lib/utils";

type Props = { indice: number; disp: Disposicion };

function BotonPlastilina({
  onClick,
  disabled,
  children,
  etiqueta,
  principal,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
  etiqueta: string;
  principal?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      className={cn(
        "boton-plastilina inline-flex min-h-12 min-w-12 items-center justify-center gap-2 px-5 font-display text-lg font-semibold",
        principal ? "bg-calendula text-tinta" : "bg-fieltro text-crema",
      )}
    >
      {children}
    </button>
  );
}

export function Controles({ indice, disp }: Props) {
  const capa = useCapa();
  // horizontal: bajo el panel; vertical: al borde inferior, sobre el planeta (no tapa al dino)
  const { x0, x1 } = disp.panel;
  const posicion =
    disp.modo === "horizontal"
      ? { left: `${x0 * 100}%`, right: `${(1 - x1) * 100}%`, bottom: "2.2vh" }
      : { left: "4%", right: "4%", bottom: "2vh" };

  return (
    <nav aria-label="Navegación de la presentación" className="fixed z-20 flex items-center gap-3" style={posicion}>
      <BotonPlastilina onClick={anterior} disabled={indice === 0 && capa === 0} etiqueta="Paso anterior">
        <ArrowLeft aria-hidden className="size-5" />
      </BotonPlastilina>

      {/* avance por capítulo: un rollito de plastilina por capítulo, largo según sus pasos */}
      <ol className="hidden min-w-0 flex-1 items-center gap-1.5 md:flex" aria-label="Capítulos">
        {CAPITULOS.map((cap) => {
          const pasos = DIAPOSITIVAS.flatMap((d, i) => (d.capitulo === cap.id ? [i] : []));
          const primero = pasos[0];
          const ultimo = pasos[pasos.length - 1];
          const actual = indice >= primero && indice <= ultimo;
          const hecho = indice > ultimo ? 1 : actual ? (indice - primero + 1) / pasos.length : 0;
          return (
            <li key={cap.id} className="min-w-0" style={{ flexGrow: pasos.length, flexBasis: 0 }}>
              <button
                type="button"
                onClick={() => ir(primero)}
                aria-label={`Ir al capítulo ${cap.nombre} (pasos ${primero + 1} a ${ultimo + 1})`}
                aria-current={actual ? "step" : undefined}
                title={cap.nombre}
                className="flex h-8 w-full items-center"
              >
                <span className="piedrita relative block h-2.5 w-full overflow-hidden bg-piedra/35">
                  <span
                    className={cn("absolute inset-y-0 left-0", actual ? "bg-calendula" : "bg-crema/70")}
                    style={{ width: `${hecho * 100}%` }}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <p className="ml-auto font-display text-xl font-semibold tabular-nums text-crema md:ml-0" aria-hidden>
        {String(indice + 1).padStart(2, "0")} <span className="text-crema/50">/ {TOTAL}</span>
        {capasDe(indice) > 1 && (
          <span className="ml-2 inline-flex items-center gap-1 align-middle" aria-label={`capa ${capa + 1} de ${capasDe(indice)}`}>
            {Array.from({ length: capasDe(indice) }, (_, k) => (
              <span key={k} className={cn("piedrita inline-block size-2.5", k <= capa ? "bg-calendula" : "bg-crema/30")} />
            ))}
          </span>
        )}
      </p>

      <BotonPlastilina onClick={siguiente} disabled={indice === TOTAL - 1 && capa === capasDe(indice) - 1} etiqueta="Paso siguiente" principal>
        <span>Siguiente</span>
        <ArrowRight aria-hidden className="size-5" />
      </BotonPlastilina>
    </nav>
  );
}
