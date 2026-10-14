/*
 * Capas de la expo: cada paso se arma por partes y la flecha suma la que sigue.
 * - <Capa n={2}>: lo de la segunda capa. Ocupa su lugar desde el principio (invisible) para que
 *   el papel no salte al aparecer, y entra en doses cuando le toca.
 * - <Contador>: una cifra que sube contando en doses cuando su capa aparece.
 * En el proyecto completo cada paso tiene una sola capa: todo se ve de una.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useCapa } from "@/presentacion/navegacion";
import { usePrefiereMenosMovimiento } from "@/lib/movimiento";
import { cn } from "@/lib/utils";

/** si lo que está dentro ya se ve (para que los contadores arranquen a tiempo) */
const CapaVisible = createContext(true);
export const useCapaVisible = () => useContext(CapaVisible);

export function Capa({ n, children, className }: { n: number; children: ReactNode; className?: string }) {
  const capa = useCapa();
  const activa = capa + 1 >= n;
  return (
    <CapaVisible.Provider value={activa}>
      <div className={cn(activa ? "capa-expo--activa" : "capa-expo--oculta", className)} aria-hidden={!activa}>
        {children}
      </div>
    </CapaVisible.Provider>
  );
}

/** Cifra que sube contando, en doses (12 por segundo), desde 0 hasta `hasta`. */
export function Contador({ hasta, formato, cuadros = 9 }: { hasta: number; formato: (v: number) => string; cuadros?: number }) {
  const visible = useCapaVisible();
  const quieto = usePrefiereMenosMovimiento();
  const [paso, setPaso] = useState(quieto ? cuadros : 0);
  useEffect(() => {
    if (!visible || quieto) {
      setPaso(quieto ? cuadros : 0);
      return;
    }
    setPaso(0);
    let k = 0;
    const id = window.setInterval(() => {
      k++;
      setPaso(k);
      if (k >= cuadros) window.clearInterval(id);
    }, 1000 / 12);
    return () => window.clearInterval(id);
  }, [visible, quieto, cuadros]);
  // sale rápido y frena al final
  const t = Math.min(1, paso / cuadros);
  const v = hasta * (1 - Math.pow(1 - t, 3));
  return <span className="tabular-nums">{formato(t >= 1 ? hasta : v)}</span>;
}
