/*
 * El dino de plastilina (GLB de Blender) actuando en doses.
 * Cada reacción es una pose de cara (cejas, párpados, pupilas, boca de reemplazo, cabeza).
 * Al cambiar de reacción hay anticipación: una pose intermedia con aplastamiento, luego
 * la pose final con estiramiento, como en stop motion.
 */
import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Reaccion } from "@/presentacion/diapositivas";
import { cuadroActual, temblor } from "@/lib/enDoses";

export const URL_DINO = "/modelos/dino.glb";

/** Giro del párpado que lo cierra del todo (desde "abierto", -62° en Blender). */
const CERRAR = THREE.MathUtils.degToRad(154);

type Pose = {
  cejaL: number;
  cejaR: number;
  /** 0 abierto, negativo = más abiertos de lo normal. Las poses no cierran los ojos: solo el parpadeo. */
  parpado: number;
  pupila: number;
  boca: "sonrisa" | "o";
  ladeo: number;
  cabeceo: number;
  salto?: boolean;
};

const POSES: Record<Reaccion | "neutral", Pose> = {
  neutral: { cejaL: 0, cejaR: 0, parpado: 0, pupila: 1, boca: "sonrisa", ladeo: 0.1, cabeceo: 0 },
  saluda: { cejaL: 0.03, cejaR: 0.03, parpado: 0, pupila: 1, boca: "sonrisa", ladeo: 0.2, cabeceo: 0, salto: true },
  curioso: { cejaL: 0.035, cejaR: -0.005, parpado: 0, pupila: 1.06, boca: "sonrisa", ladeo: 0.24, cabeceo: 0 },
  duda: { cejaL: 0.04, cejaR: -0.018, parpado: 0, pupila: 1, boca: "sonrisa", ladeo: -0.2, cabeceo: 0.04 },
  piensa: { cejaL: 0.022, cejaR: 0.022, parpado: 0, pupila: 1, boca: "sonrisa", ladeo: 0.12, cabeceo: -0.1 },
  susto: { cejaL: 0.07, cejaR: 0.07, parpado: -0.1, pupila: 0.62, boca: "o", ladeo: -0.04, cabeceo: -0.18 },
  alivio: { cejaL: -0.008, cejaR: -0.008, parpado: 0.06, pupila: 1, boca: "sonrisa", ladeo: 0.16, cabeceo: 0.06 },
  asombro: { cejaL: 0.06, cejaR: 0.06, parpado: -0.08, pupila: 0.8, boca: "o", ladeo: 0, cabeceo: -0.1 },
  celebra: { cejaL: 0.045, cejaR: 0.045, parpado: 0, pupila: 1, boca: "sonrisa", ladeo: 0.26, cabeceo: -0.05, salto: true },
  decepcion: { cejaL: -0.02, cejaR: -0.02, parpado: 0.06, pupila: 1, boca: "sonrisa", ladeo: -0.1, cabeceo: 0.16 },
  tapaOjos: { cejaL: 0.05, cejaR: 0.05, parpado: -0.06, pupila: 0.7, boca: "o", ladeo: 0, cabeceo: 0.1 },
  sacudido: { cejaL: 0.08, cejaR: 0.08, parpado: -0.12, pupila: 0.55, boca: "o", ladeo: 0.22, cabeceo: -0.22, salto: true },
  mareado: { cejaL: 0.07, cejaR: -0.015, parpado: 0.04, pupila: 0.72, boca: "o", ladeo: 0.32, cabeceo: 0.08 },
};

function mezclar(a: Pose, b: Pose, t: number): Pose {
  const m = (x: number, y: number) => x + (y - x) * t;
  return {
    cejaL: m(a.cejaL, b.cejaL),
    cejaR: m(a.cejaR, b.cejaR),
    parpado: m(a.parpado, b.parpado),
    pupila: m(a.pupila, b.pupila),
    boca: t >= 0.5 ? b.boca : a.boca,
    ladeo: m(a.ladeo, b.ladeo),
    cabeceo: m(a.cabeceo, b.cabeceo),
  };
}

function buscar(raiz: THREE.Object3D, nombre: string) {
  const o = raiz.getObjectByName(nombre);
  if (!o) throw new Error(`Nodo "${nombre}" no está en ${URL_DINO}`);
  return o;
}

type Props = {
  reaccion: Reaccion;
  /** Punto del mundo que mira; null = sigue al cursor. */
  mirada: MutableRefObject<THREE.Vector3 | null>;
  quieto: boolean;
};

export function Dino({ reaccion, mirada, quieto }: Props) {
  const { scene } = useGLTF(URL_DINO);
  const p = useMemo(() => {
    scene.traverse((o) => {
      // proyecta sombra sobre el planeta pero no sobre sí mismo (evita manchas negras)
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = false;
      }
    });
    const pupilas = ["L", "R"].map((l) => buscar(scene, `ojo_pupila_${l}_w`));
    const cejas = ["L", "R"].map((l) => buscar(scene, `ceja_${l}`));
    const parpados = ["L", "R"].map((l) => buscar(scene, `parpado_${l}`));
    return {
      raiz: scene,
      cabeza: buscar(scene, "cabeza"),
      miradas: ["L", "R"].map((l) => buscar(scene, `mirada_${l}`)),
      parpados,
      cejas,
      pupilas,
      sonrisa: buscar(scene, "boca_sonrisa"),
      bocaO: buscar(scene, "boca_o"),
      abierto: parpados[0].rotation.x,
      cejaY: cejas.map((c) => c.position.y),
      pupilaEscala: pupilas.map((q) => q.scale.clone()),
      cabezaRot: buscar(scene, "cabeza").rotation.clone(),
      raizY: scene.position.y,
    };
  }, [scene]);

  const estado = useRef({ reaccion, desde: POSES.neutral, actual: POSES.neutral, inicio: -100 });
  const objetivoMirada = useMemo(() => new THREE.Vector3(), []);
  const posCabeza = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock, pointer, camera }) => {
    const c = quieto ? 1000 : cuadroActual(clock.elapsedTime);
    const e = estado.current;
    if (e.reaccion !== reaccion) {
      e.desde = e.actual;
      e.reaccion = reaccion;
      e.inicio = c;
    }
    const meta = POSES[reaccion];
    const k = c - e.inicio;
    // anticipación: 2 cuadros a medio camino, luego la pose final
    const pose = quieto ? meta : mezclar(e.desde, meta, k < 2 ? 0.5 : 1);
    e.actual = pose;

    // aplastar -> estirar -> respirar
    let sy = 1 + Math.sin(c * 0.35) * 0.008;
    let sxz = 1;
    if (!quieto && k < 2) [sy, sxz] = [0.95, 1.03];
    else if (!quieto && k < 4) [sy, sxz] = [1.04, 0.98];
    p.raiz.scale.set(sxz, sy, sxz);
    const saltos = [0.12, 0.17, 0.1, 0.04];
    p.raiz.position.y = p.raizY + (!quieto && meta.salto && k >= 2 && k < 6 ? saltos[k - 2] : 0);

    // párpados: pose + parpadeo real (medio, cerrado x2, medio) cada ~3.5 s
    let cierre = pose.parpado;
    if (!quieto && cierre < 0.95) {
      const fase = (c + 7) % 42;
      if (fase === 38 || fase === 41) cierre = Math.max(cierre, 0.29);
      if (fase === 39 || fase === 40) cierre = 1;
    }
    for (const q of p.parpados) q.rotation.x = p.abierto + cierre * CERRAR;

    p.cejas[0].position.y = p.cejaY[0] + pose.cejaL;
    p.cejas[1].position.y = p.cejaY[1] + pose.cejaR;
    p.pupilas.forEach((q, i) => {
      const base = p.pupilaEscala[i];
      q.scale.set(base.x * pose.pupila, base.y * pose.pupila, base.z);
    });
    p.sonrisa.visible = pose.boca === "sonrisa";
    p.bocaO.visible = pose.boca === "o";

    // a dónde mira: el asteroide en vuelo, o el cursor (hacia la cámara)
    if (mirada.current) objetivoMirada.copy(mirada.current);
    else objetivoMirada.set(camera.position.x + pointer.x * 4, camera.position.y + pointer.y * 2.5, camera.position.z);
    p.cabeza.getWorldPosition(posCabeza);
    const giro = THREE.MathUtils.clamp((objetivoMirada.x - posCabeza.x) * 0.06, -0.35, 0.35);
    p.cabeza.rotation.set(
      p.cabezaRot.x + pose.cabeceo + temblor(c, 4, 0.008),
      p.cabezaRot.y + giro,
      p.cabezaRot.z + pose.ladeo + temblor(c, 5, 0.008),
    );
    p.cabeza.updateMatrixWorld(true);
    for (const m of p.miradas) m.lookAt(objetivoMirada);
  });

  return <primitive object={scene} />;
}

useGLTF.preload(URL_DINO);
