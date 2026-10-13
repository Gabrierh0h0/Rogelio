/*
 * Cinemática final en 3D: un asteroide gigante con estela de fuego de plastilina cae sobre
 * la Tierra, al lado del dino. Bola de fuego, onda expansiva, pedazos de plastilina que
 * saltan, humo de algodón, temblor de cámara y un cráter con lava que queda brillando.
 * Todo en doses (12 fps). Con "reducir movimiento" solo se ve el cráter final.
 */
import { useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { CINE, type Fase } from "@/presentacion/cinematica";
import { cuadroActual, FPS_DOSES, temblor } from "@/lib/enDoses";
import { URL_ASTEROIDES } from "./Asteroides";
import { crearReloj, segundosCine } from "./relojCine";
import { usePrecompilar } from "./precompilar";
import { CENTRO_PLANETA, NORMAL_IMPACTO, RADIO_PLANETA } from "./Set";

/** Amplitud del temblor de cámara; la lee el rig de cámara de Escena.tsx. */
export const sacudida = { valor: 0 };

// Punto de impacto: adelante a la derecha del dino, en la cara visible de la Tierra.
const NORMAL = NORMAL_IMPACTO;
const PUNTO = CENTRO_PLANETA.clone().addScaledVector(NORMAL, RADIO_PLANETA + 0.03);
// arranca arriba a la derecha, ya dentro del cuadro, para que se vea venir desde el principio
const INICIO = PUNTO.clone().add(new THREE.Vector3(5.2, 4.6, -2.4));
const HACIA_NORMAL = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), NORMAL);
const N_FRAG = 26;
const N_HUMO = 14;
const N_ESTELA = 12;

function azar(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Trayectoria del asteroide: acelera al caer, con una pequeña curva. */
function trayectoria(s: number, out: THREE.Vector3) {
  const k = THREE.MathUtils.clamp(s / CINE.impacto, 0, 1);
  out.copy(INICIO).lerp(PUNTO, k * k);
  out.y += Math.sin(k * Math.PI) * 0.6;
  return out;
}

type Props = { fase: Fase; quieto: boolean; mirada: MutableRefObject<THREE.Vector3 | null> };

export function Impacto({ fase, quieto, mirada }: Props) {
  const { scene } = useGLTF(URL_ASTEROIDES);
  const bolido = useMemo(() => {
    const o = scene.getObjectByName("asteroide_1")!.clone(true);
    o.position.set(0, 0, 0);
    o.traverse((m) => {
      if ((m as THREE.Mesh).isMesh) m.castShadow = true;
    });
    return o;
  }, [scene]);

  const grupo = useRef<THREE.Group>(null);
  const roca = useRef<THREE.Group>(null);
  const estela = useRef<THREE.InstancedMesh>(null);
  const fragmentos = useRef<THREE.InstancedMesh>(null);
  const humo = useRef<THREE.InstancedMesh>(null);
  const fuego = useRef<THREE.Mesh>(null);
  const onda = useRef<THREE.Mesh>(null);
  const crater = useRef<THREE.Group>(null);
  const lava = useRef<THREE.MeshStandardMaterial>(null);
  const luz = useRef<THREE.PointLight>(null);
  const reloj = useRef(crearReloj());
  usePrecompilar(grupo);

  // datos fijos de cada partícula
  const datos = useMemo(() => {
    const rnd = azar(17);
    const t1 = new THREE.Vector3().crossVectors(NORMAL, new THREE.Vector3(0, 1, 0)).normalize();
    const t2 = new THREE.Vector3().crossVectors(NORMAL, t1).normalize();
    const lado = () => t1.clone().multiplyScalar(rnd() * 2 - 1).add(t2.clone().multiplyScalar(rnd() * 2 - 1));
    return {
      frag: Array.from({ length: N_FRAG }, () => ({
        vel: NORMAL.clone().multiplyScalar(1.6 + rnd() * 2.2).add(lado().multiplyScalar(1.1 + rnd() * 1.4)),
        giro: new THREE.Vector3(rnd() * 8, rnd() * 8, rnd() * 8),
        escala: 0.05 + rnd() * 0.08,
      })),
      humo: Array.from({ length: N_HUMO }, () => ({
        dir: NORMAL.clone().multiplyScalar(0.7 + rnd() * 0.6).add(lado().multiplyScalar(0.7)),
        escala: 0.18 + rnd() * 0.22,
        retraso: rnd() * 0.35,
      })),
    };
  }, []);

  // colores por instancia (una vez)
  useLayoutEffect(() => {
    const c = new THREE.Color();
    const paleta = ["#e8532b", "#f29a2e", "#b8462e", "#6b4a33", "#f6c64a"];
    for (let i = 0; i < N_FRAG; i++) fragmentos.current?.setColorAt(i, c.set(paleta[i % paleta.length]));
    for (let i = 0; i < N_ESTELA; i++) estela.current?.setColorAt(i, c.set("#ffd23f").lerp(new THREE.Color("#e8432b"), i / N_ESTELA));
    for (let i = 0; i < N_HUMO; i++) humo.current?.setColorAt(i, c.set(i % 3 ? "#d8d3cb" : "#a59d93"));
    [fragmentos, estela, humo].forEach((r) => {
      if (r.current?.instanceColor) r.current.instanceColor.needsUpdate = true;
    });
  }, []);

  const aux = useMemo(
    () => ({
      p: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      e: new THREE.Euler(),
      s: new THREE.Vector3(),
      m: new THREE.Matrix4(),
      cero: new THREE.Matrix4().makeScale(0, 0, 0),
      centro: CENTRO_PLANETA.clone(),
    }),
    [],
  );

  useFrame(({ clock }) => {
    const g = grupo.current;
    if (!g) return;
    const t = Math.floor(clock.elapsedTime * FPS_DOSES) / FPS_DOSES;
    const s = segundosCine(reloj.current, fase, quieto, t);
    if (s === null) {
      g.visible = false;
      sacudida.valor = 0;
      return;
    }
    g.visible = true;
    const c = cuadroActual(clock.elapsedTime);
    const d = s - CINE.impacto; // tiempo desde el choque

    // 1) el asteroide en caída y su estela de fuego
    const cayendo = s < CINE.impacto;
    roca.current!.visible = cayendo;
    if (cayendo) {
      trayectoria(s, roca.current!.position);
      roca.current!.position.x += temblor(c, 1, 0.03);
      roca.current!.rotation.set(s * 2.1, s * 1.4, 0);
      mirada.current = g.localToWorld(roca.current!.position.clone());
    } else {
      mirada.current = s < CINE.despues ? g.localToWorld(PUNTO.clone()) : null;
    }
    for (let k = 0; k < N_ESTELA; k++) {
      const sk = s - (k + 1) * 0.06;
      if (!cayendo || sk < 0) {
        estela.current!.setMatrixAt(k, aux.cero);
        continue;
      }
      trayectoria(sk, aux.p);
      aux.p.x += temblor(c, k + 3, 0.06);
      aux.p.y += temblor(c, k + 9, 0.06);
      aux.s.setScalar(0.42 * (1 - k / N_ESTELA) * (0.85 + temblor(c, k, 0.15)));
      aux.m.compose(aux.p, aux.q.identity(), aux.s);
      estela.current!.setMatrixAt(k, aux.m);
    }
    estela.current!.instanceMatrix.needsUpdate = true;

    // 2) bola de fuego y onda expansiva
    const enFuego = !quieto && d >= 0 && d < 0.7;
    fuego.current!.visible = enFuego;
    if (enFuego) fuego.current!.scale.setScalar(d < 0.25 ? (d / 0.25) * 0.95 : 0.95 * (1 - (d - 0.25) / 0.45));
    const enOnda = !quieto && d >= 0 && d < 0.6;
    onda.current!.visible = enOnda;
    if (enOnda) onda.current!.scale.setScalar(0.2 + (d / 0.6) * 1.8);

    // 3) pedazos de plastilina: salen disparados y caen de vuelta a la superficie
    for (let i = 0; i < N_FRAG; i++) {
      const f = datos.frag[i];
      if (quieto || d < 0 || d > 2.2) {
        fragmentos.current!.setMatrixAt(i, aux.cero);
        continue;
      }
      aux.p.copy(PUNTO).addScaledVector(f.vel, d).addScaledVector(NORMAL, -3.4 * d * d);
      if (aux.p.distanceTo(aux.centro) < RADIO_PLANETA + 0.05) {
        aux.p.sub(aux.centro).setLength(RADIO_PLANETA + 0.05).add(aux.centro);
      }
      aux.q.setFromEuler(aux.e.set(f.giro.x * d, f.giro.y * d, f.giro.z * d));
      aux.s.setScalar(f.escala * (d > 1.7 ? 1 - (d - 1.7) / 0.5 : 1));
      aux.m.compose(aux.p, aux.q, aux.s);
      fragmentos.current!.setMatrixAt(i, aux.m);
    }
    fragmentos.current!.instanceMatrix.needsUpdate = true;

    // 4) humo de algodón: crece, sube un poco y se deshace cuando aparece el final
    const fin = CINE.despues - CINE.impacto - 0.6; // se deshace antes de que la Tierra suba
    for (let i = 0; i < N_HUMO; i++) {
      const h = datos.humo[i];
      const dh = d - h.retraso;
      if (quieto || dh < 0 || dh > fin + 1.2) {
        humo.current!.setMatrixAt(i, aux.cero);
        continue;
      }
      aux.p.copy(PUNTO).addScaledVector(h.dir, Math.min(dh, 2.5) * 0.45);
      aux.p.x += temblor(c, i + 30, 0.015);
      const crece = Math.min(1, dh / 0.7);
      const deshace = dh > fin ? 1 - (dh - fin) / 1.2 : 1;
      aux.s.setScalar(h.escala * crece * deshace);
      aux.m.compose(aux.p, aux.q.identity(), aux.s);
      humo.current!.setMatrixAt(i, aux.m);
    }
    humo.current!.instanceMatrix.needsUpdate = true;

    // 5) cráter con lava que late; luz naranja del golpe
    crater.current!.visible = d >= 0;
    if (lava.current) lava.current.emissiveIntensity = 1.4 + temblor(c, 50, 0.35);
    luz.current!.intensity = quieto ? 3 : d >= 0 && d < 1.2 ? 45 * (1 - d / 1.2) + 3 : d >= 0 ? 3 : 0;

    // 6) temblor de cámara justo después del choque
    sacudida.valor = !quieto && d >= 0 && d < 0.8 ? 0.22 * (1 - d / 0.8) : 0;
  });

  return (
    <group ref={grupo} visible={false}>
      <group ref={roca} scale={1.25}>
        <primitive object={bolido} />
      </group>

      <instancedMesh ref={estela} args={[undefined, undefined, N_ESTELA]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#ffffff" emissive="#ff7a1a" emissiveIntensity={1.2} roughness={0.7} />
      </instancedMesh>

      <mesh ref={fuego} position={PUNTO} visible={false}>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial color="#ffb347" emissive="#ff6a00" emissiveIntensity={2} roughness={0.8} />
      </mesh>

      <mesh ref={onda} position={PUNTO.clone().addScaledVector(NORMAL, 0.02)} quaternion={HACIA_NORMAL} visible={false}>
        <ringGeometry args={[0.8, 1, 40]} />
        <meshStandardMaterial color="#fff1c4" emissive="#ffd58a" emissiveIntensity={1} transparent opacity={0.75} side={THREE.DoubleSide} />
      </mesh>

      <instancedMesh ref={fragmentos} args={[undefined, undefined, N_FRAG]} castShadow frustumCulled={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#ffffff" emissive="#ff5a1f" emissiveIntensity={0.35} roughness={0.75} />
      </instancedMesh>

      <instancedMesh ref={humo} args={[undefined, undefined, N_HUMO]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial color="#ffffff" roughness={1} />
      </instancedMesh>

      <group ref={crater} position={PUNTO} quaternion={HACIA_NORMAL} scale={[1, 1, 0.45]} visible={false}>
        <mesh>
          <torusGeometry args={[0.22, 0.06, 10, 28]} />
          <meshStandardMaterial color="#4a3326" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0, -0.01]}>
          <circleGeometry args={[0.2, 28]} />
          <meshStandardMaterial ref={lava} color="#ff7a1a" emissive="#ff4d00" emissiveIntensity={1.4} roughness={0.6} />
        </mesh>
      </group>

      <pointLight ref={luz} position={PUNTO.clone().addScaledVector(NORMAL, 0.5)} color="#ff8a3d" intensity={0} distance={6} decay={1.5} />
    </group>
  );
}
