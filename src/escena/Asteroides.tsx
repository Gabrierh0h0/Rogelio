/*
 * Un asteroide por diapositiva, colgados de hilos y orbitando el planeta.
 * Al cambiar de paso, el asteroide de esa diapositiva llega detrás del panel con su cinemática
 * (escena/coreografias.ts: en el proyecto completo vuela, tiembla y se abre como geoda; en la
 * expo cada paso llega distinto) y el anterior se cierra y vuelve a su órbita. Todo en doses.
 *
 * Rendimiento: las mitades se dibujan con InstancedMesh (una por variante, lado y material),
 * así 30 asteroides cuestan ~12 llamadas de dibujo.
 */
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { DISTANCIA_ANCLA, TIEMPOS, type Disposicion } from "@/presentacion/disposicion";
import { TOTAL } from "@/presentacion/diapositivas";
import { cuadroActual, FPS_DOSES, temblor } from "@/lib/enDoses";
import { materialGeoda } from "./geoda";
import { estadoCoreo, nuevaPose, poseActiva, reiniciarPose, suave, tramo, type Ctx } from "./coreografias";
import { cinematicaDe, COREOGRAFIAS } from "@/presentacion/coreografias";

export const URL_ASTEROIDES = "/modelos/asteroides.glb";
const VARIANTES = 3;
const RADIO_MODELO = 0.42;
/** dónde quedan las manos del dino respecto a la isla (cinemática "atrapa") */
const MANOS_DINO = new THREE.Vector3(0, 0.78, 0.72);

type Parte = { geometria: THREE.BufferGeometry; material: THREE.Material };


function hash(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

type Props = {
  indice: number;
  disp: Disposicion;
  quieto: boolean;
  onElegir: (i: number) => void;
  onSobre: (i: number | null, x: number, y: number) => void;
  /** Salida: dónde está el asteroide activo (para que el dino lo siga con la mirada). */
  posActiva: MutableRefObject<THREE.Vector3 | null>;
};

export function Asteroides({ indice, disp, quieto, onElegir, onSobre, posActiva }: Props) {
  const { scene } = useGLTF(URL_ASTEROIDES);
  const camara = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const invalidate = useThree((s) => s.invalidate);

  // Partes (geometría + material) por variante y lado; la tapa recibe la geoda dibujada.
  const partes = useMemo(() => {
    const geodas = Array.from({ length: VARIANTES }, (_, v) => materialGeoda(v));
    return Array.from({ length: VARIANTES }, (_, v) => {
      const lados = { L: [] as Parte[], R: [] as Parte[] };
      for (const lado of ["L", "R"] as const) {
        const nodo = scene.getObjectByName(`mitad_${lado}_${v}`);
        if (!nodo) throw new Error(`Falta mitad_${lado}_${v} en ${URL_ASTEROIDES}`);
        nodo.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          const mat = m.material as THREE.Material;
          lados[lado].push({ geometria: m.geometry, material: mat.name.startsWith("geoda") ? geodas[v] : mat });
        });
      }
      return lados;
    });
  }, [scene]);

  // Asteroide i -> variante i % 3, casilla floor(i / 3) dentro de su InstancedMesh
  const porVariante = useMemo(
    () =>
      Array.from({ length: VARIANTES }, (_, v) =>
        Array.from({ length: TOTAL }, (_, i) => i).filter((i) => i % VARIANTES === v),
      ),
    [],
  );

  const mallas = useRef<THREE.InstancedMesh[][]>([]);
  const sobre = useRef<number | null>(null);
  const cambio = useRef({ actual: indice, anterior: -1, desde: -1 });

  useEffect(() => {
    const c = cambio.current;
    if (c.actual !== indice) {
      c.anterior = c.actual;
      c.actual = indice;
      c.desde = -1; // se fija con el reloj en el próximo cuadro
      invalidate();
    }
  }, [indice, invalidate]);

  // auxiliares reutilizados (sin basura por cuadro)
  const aux = useMemo(
    () => ({
      pos: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
      identidad: new THREE.Quaternion(),
      esc: new THREE.Vector3(),
      euler: new THREE.Euler(),
      matAst: new THREE.Matrix4(),
      matMitad: new THREE.Matrix4(),
      mat: new THREE.Matrix4(),
      ancla: new THREE.Vector3(),
      orbita: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      desplazo: new THREE.Vector3(),
      giro: new THREE.Quaternion(),
      uno: new THREE.Vector3(1, 1, 1),
    }),
    [],
  );

  const pose = useMemo(nuevaPose, []);
  const contexto = useMemo<Ctx>(
    () => ({
      s: 0,
      orbita: new THREE.Vector3(),
      quatOrbita: new THREE.Quaternion(),
      enOrbita: 1,
      ancla: new THREE.Vector3(),
      escalaAbierta: 1,
      separacion: 1,
      camara: new THREE.Vector3(),
      manos: new THREE.Vector3(),
    }),
    [],
  );

  const geometriaHilos = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TOTAL * 2 * 3), 3));
    return g;
  }, []);

  useFrame(({ clock, size }) => {
    const t = Math.floor(clock.elapsedTime * FPS_DOSES) / FPS_DOSES; // tiempo en doses
    const c = cuadroActual(clock.elapsedTime);
    const ch = cambio.current;
    if (ch.desde < 0) ch.desde = t;
    // solo en desarrollo: window.__coreoS congela la cinemática en ese segundo (para revisarla)
    const congelado = import.meta.env.DEV ? (window as unknown as { __coreoS?: number }).__coreoS : undefined;
    const s = typeof congelado === "number" ? congelado : quieto ? 99 : t - ch.desde;

    // Ancla: centro del panel, a DISTANCIA_ANCLA de la cámara
    const { x0, x1, y0, y1 } = disp.panel;
    aux.dir.set(x0 + x1 - 1, 1 - (y0 + y1), 0.5).unproject(camara).sub(camara.position).normalize();
    aux.ancla.copy(camara.position).addScaledVector(aux.dir, DISTANCIA_ANCLA);
    const altoVisible = 2 * DISTANCIA_ANCLA * Math.tan(THREE.MathUtils.degToRad(camara.fov / 2));
    const anchoVisible = altoVisible * (size.width / size.height);
    // los bultos hacen la piedra ~40% más grande que RADIO_MODELO: por eso 0.36 y no 0.5
    const escalaAbierta = (altoVisible * (y1 - y0) * 0.36) / (2 * RADIO_MODELO);
    const separacion = (anchoVisible * (x1 - x0)) / 2 / escalaAbierta; // en unidades del modelo

    // la cinemática del paso actual (la expo usa una distinta en cada paso)
    const nombre = cinematicaDe(ch.actual);
    const ctx = contexto;
    ctx.s = s;
    ctx.ancla.copy(aux.ancla);
    ctx.escalaAbierta = escalaAbierta;
    ctx.separacion = separacion;
    ctx.camara.copy(camara.position);
    ctx.manos.set(...disp.isla).add(MANOS_DINO);
    estadoCoreo.nombre = nombre;
    estadoCoreo.s = s;
    estadoCoreo.ancla.copy(aux.ancla);
    estadoCoreo.radio = RADIO_MODELO * 1.4 * escalaAbierta;

    const { centro, rx, rz } = disp.orbita;
    const posicionHilos = geometriaHilos.attributes.position as THREE.BufferAttribute;
    let activa: THREE.Vector3 | null = null;
    const p = pose;

    for (let v = 0; v < VARIANTES; v++) {
      porVariante[v].forEach((i, casilla) => {
        // órbita
        const ang = (i / TOTAL) * Math.PI * 2 + t * 0.035;
        // órbita inclinada: por delante pasa alto (sobre la cabeza del dino), por detrás bajo
        aux.orbita.set(
          centro[0] + Math.cos(ang) * rx,
          centro[1] + Math.sin(ang) * 1.3 + Math.sin(ang * 2 + i) * 0.35 + (hash(i) - 0.5) * 0.5,
          centro[2] + Math.sin(ang) * rz,
        );
        const enOrbita = (0.5 + hash(i + 7) * 0.3) * (sobre.current === i ? 1.22 : 1);
        aux.euler.set(i * 1.7 + t * 0.25, i * 0.9 + t * 0.18, 0);
        aux.quat.setFromEuler(aux.euler);

        reiniciarPose(p, separacion);
        if (i === ch.actual) {
          ctx.orbita.copy(aux.orbita);
          ctx.quatOrbita.copy(aux.quat);
          ctx.enOrbita = enOrbita;
          poseActiva(nombre, ctx, p);
        } else {
          // el anterior se cierra y vuelve a su órbita; los demás orbitan
          let abre = 0;
          let vuela = 0;
          if (i === ch.anterior && s < TIEMPOS.cierre + TIEMPOS.regreso) {
            abre = 1 - suave(tramo(s, 0, TIEMPOS.cierre));
            vuela = 1 - suave(tramo(s, TIEMPOS.cierre, TIEMPOS.regreso));
          }
          p.pos.copy(aux.orbita).lerp(aux.ancla, vuela);
          p.escala = enOrbita + (escalaAbierta - enOrbita) * vuela;
          p.quat.copy(aux.quat).slerp(aux.identidad, vuela);
          p.abre = abre;
          p.hilo = vuela < 0.01;
        }
        if (p.sacude && !quieto) {
          p.pos.x += temblor(c, 11, 0.035);
          p.pos.y += temblor(c, 12, 0.035);
        }
        aux.esc.copy(p.estira).multiplyScalar(p.oculto ? 0 : p.escala);
        aux.matAst.compose(p.pos, p.quat, aux.esc);
        if (i === ch.actual) activa = (p.abre > 0.01 ? aux.ancla : p.pos).clone();

        // hilo: del asteroide hacia arriba; se suelta cuando no cuelga
        const tope = p.pos.y + RADIO_MODELO * p.escala * p.estira.y;
        const visible = p.hilo && !p.oculto;
        posicionHilos.setXYZ(i * 2, p.pos.x, visible ? tope : -100, p.pos.z);
        posicionHilos.setXYZ(i * 2 + 1, p.pos.x, visible ? tope + 14 : -100, p.pos.z);

        (["L", "R"] as const).forEach((lado, k) => {
          const signo = lado === "L" ? -1 : 1;
          aux.euler.set(signo * p.giro.x * p.abre, signo * p.giro.y * p.abre, signo * p.giro.z * p.abre);
          aux.giro.setFromEuler(aux.euler);
          aux.desplazo.set(signo * p.desplazo.x * p.abre, (p.espejoY ? signo : 1) * p.desplazo.y * p.abre, p.desplazo.z * p.abre);
          aux.matMitad.compose(aux.desplazo, aux.giro, aux.uno);
          aux.mat.multiplyMatrices(aux.matAst, aux.matMitad);
          for (const malla of mallas.current[v * 2 + k] ?? []) malla.setMatrixAt(casilla, aux.mat);
        });
      });
    }
    // el dino mira al asteroide mientras llega y se abre; después vuelve a mirar al público
    // sin asteroide activo (cinemática final) la mirada la maneja Impacto.tsx
    if (ch.actual >= 0) posActiva.current = s < COREOGRAFIAS[nombre].panel + 0.8 ? activa : null;
    for (const fila of mallas.current) {
      for (const malla of fila ?? []) {
        malla.instanceMatrix.needsUpdate = true;
        malla.computeBoundingSphere();
      }
    }
    posicionHilos.needsUpdate = true;
  });

  const eventos = (v: number) => ({
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const i = porVariante[v][e.instanceId ?? -1];
      if (i === undefined || i === cambio.current.actual) return;
      if (sobre.current !== i) {
        sobre.current = i;
        document.body.style.cursor = "pointer";
        invalidate();
      }
      onSobre(i, e.nativeEvent.clientX, e.nativeEvent.clientY);
    },
    onPointerOut: () => {
      sobre.current = null;
      document.body.style.cursor = "";
      onSobre(null, 0, 0);
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const i = porVariante[v][e.instanceId ?? -1];
      if (i !== undefined && i !== cambio.current.actual) onElegir(i);
    },
  });

  return (
    <group>
      {partes.map((lados, v) =>
        (["L", "R"] as const).map((lado, k) => (
          <group key={`${v}${lado}`} {...eventos(v)}>
            {lados[lado].map((parte, j) => (
              <instancedMesh
                key={j}
                ref={(m) => {
                  if (m) (mallas.current[v * 2 + k] ??= [])[j] = m;
                }}
                args={[parte.geometria, parte.material, porVariante[v].length]}
                castShadow
                frustumCulled={false}
              />
            ))}
          </group>
        )),
      )}
      <lineSegments geometry={geometriaHilos} frustumCulled={false}>
        <lineBasicMaterial color="#d9d2c0" transparent opacity={0.5} />
      </lineSegments>
    </group>
  );
}

useGLTF.preload(URL_ASTEROIDES);
