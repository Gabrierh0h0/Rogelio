/*
 * Un asteroide por diapositiva, colgados de hilos y orbitando el planeta.
 * Al cambiar de paso, el asteroide de esa diapositiva vuela hasta quedar detrás del panel,
 * tiembla, y se abre por la mitad mostrando su interior de geoda; el anterior se cierra y
 * vuelve a su órbita. Todo se calcula en doses (12 fps).
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

export const URL_ASTEROIDES = "/modelos/asteroides.glb";
const VARIANTES = 3;
const RADIO_MODELO = 0.42;
const APERTURA = THREE.MathUtils.degToRad(72);

type Parte = { geometria: THREE.BufferGeometry; material: THREE.Material };

const suave = (t: number) => t * t * (3 - 2 * t);
const rebote = (t: number) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
const tramo = (s: number, a: number, d: number) => Math.min(1, Math.max(0, (s - a) / d));

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
    const s = quieto ? 99 : t - ch.desde;

    // Ancla: centro del panel, a DISTANCIA_ANCLA de la cámara
    const { x0, x1, y0, y1 } = disp.panel;
    aux.dir.set(x0 + x1 - 1, 1 - (y0 + y1), 0.5).unproject(camara).sub(camara.position).normalize();
    aux.ancla.copy(camara.position).addScaledVector(aux.dir, DISTANCIA_ANCLA);
    if (!quieto && s >= TIEMPOS.vuelo && s < TIEMPOS.vuelo + TIEMPOS.temblor) {
      aux.ancla.x += temblor(c, 11, 0.035);
      aux.ancla.y += temblor(c, 12, 0.035);
    }
    const altoVisible = 2 * DISTANCIA_ANCLA * Math.tan(THREE.MathUtils.degToRad(camara.fov / 2));
    const anchoVisible = altoVisible * (size.width / size.height);
    // los bultos hacen la piedra ~40% más grande que RADIO_MODELO: por eso 0.36 y no 0.5
    const escalaAbierta = (altoVisible * (y1 - y0) * 0.36) / (2 * RADIO_MODELO);
    const separacion = (anchoVisible * (x1 - x0)) / 2 / escalaAbierta; // en unidades del modelo

    const { centro, rx, rz } = disp.orbita;
    const posicionHilos = geometriaHilos.attributes.position as THREE.BufferAttribute;
    let activa: THREE.Vector3 | null = null;

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
        let abre = 0;
        let vuela = 0; // 0 en órbita, 1 en el ancla
        if (i === ch.actual) {
          vuela = suave(tramo(s, 0, TIEMPOS.vuelo));
          abre = rebote(tramo(s, TIEMPOS.vuelo + TIEMPOS.temblor, TIEMPOS.apertura));
        } else if (i === ch.anterior && s < TIEMPOS.cierre + TIEMPOS.regreso) {
          abre = 1 - suave(tramo(s, 0, TIEMPOS.cierre));
          vuela = 1 - suave(tramo(s, TIEMPOS.cierre, TIEMPOS.regreso));
        }
        // anticipación: antes de salir, retrocede un poco
        const retro =
          i === ch.actual && !quieto && s < TIEMPOS.vuelo * 0.2
            ? 0.3 * Math.sin((s / (TIEMPOS.vuelo * 0.2)) * Math.PI)
            : 0;
        aux.pos.copy(aux.orbita).lerp(aux.ancla, vuela);
        aux.pos.z -= retro;
        const enOrbita = (0.5 + hash(i + 7) * 0.3) * (sobre.current === i ? 1.22 : 1);
        const escala = enOrbita + (escalaAbierta - enOrbita) * vuela;
        aux.euler.set(i * 1.7 + t * 0.25, i * 0.9 + t * 0.18, 0);
        aux.quat.setFromEuler(aux.euler).slerp(aux.identidad, vuela);
        aux.esc.setScalar(escala);
        aux.matAst.compose(aux.pos, aux.quat, aux.esc);
        if (i === ch.actual) activa = (abre > 0.01 ? aux.ancla : aux.pos).clone();

        // hilo: del asteroide hacia arriba; se suelta mientras vuela al panel
        const tope = aux.pos.y + RADIO_MODELO * escala;
        const visible = vuela < 0.01;
        posicionHilos.setXYZ(i * 2, aux.pos.x, visible ? tope : -100, aux.pos.z);
        posicionHilos.setXYZ(i * 2 + 1, aux.pos.x, visible ? tope + 14 : -100, aux.pos.z);

        (["L", "R"] as const).forEach((lado, k) => {
          const signo = lado === "L" ? -1 : 1;
          aux.euler.set(0, signo * APERTURA * abre, 0);
          aux.giro.setFromEuler(aux.euler);
          aux.desplazo.set(signo * separacion * abre, 0, 0);
          aux.matMitad.compose(aux.desplazo, aux.giro, aux.uno);
          aux.mat.multiplyMatrices(aux.matAst, aux.matMitad);
          for (const malla of mallas.current[v * 2 + k] ?? []) malla.setMatrixAt(casilla, aux.mat);
        });
      });
    }
    // el dino mira al asteroide mientras llega y se abre; después vuelve a mirar al público
    // sin asteroide activo (cinemática final) la mirada la maneja Impacto.tsx
    if (ch.actual >= 0) posActiva.current = s < TIEMPOS.panel + 0.8 ? activa : null;
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
