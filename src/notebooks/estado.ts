/*
 * Si el visor de notebooks está abierto, cuál notebook y en qué sección. Lo leen el botón, el visor,
 * el teclado de la presentación (que se calla mientras el visor está abierto) y la escena 3D (que se pausa).
 */
import { useSyncExternalStore } from "react";
import type { Destino } from "./secciones";

export type EstadoVisor = { abierto: false } | ({ abierto: true; vez: number } & Destino);

let estado: EstadoVisor = { abierto: false };
let vez = 0;
const oyentes = new Set<() => void>();

function emitir(nuevo: EstadoVisor) {
  estado = nuevo;
  oyentes.forEach((f) => f());
}

/** Abre (o vuelve a apuntar) el visor; `vez` cambia en cada llamada para repetir el salto a la sección. */
export const abrirNotebook = (destino: Destino) => emitir({ abierto: true, vez: ++vez, ...destino });
export const cerrarNotebook = () => emitir({ abierto: false });
export const visorAbierto = () => estado.abierto;

export const useVisor = () =>
  useSyncExternalStore(
    (f) => {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
    () => estado,
  );
