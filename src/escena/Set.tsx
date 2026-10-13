/*
 * El set de maqueta: la Tierra de plastilina, el banquito de meteorito del dino, medias geodas
 * en el piso, estrellas de cartón colgadas de hilos y la luz (foco cálido duro + relleno azulado).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { cuadroActual, FPS_DOSES, temblor } from "@/lib/enDoses";
import { GLOSARIO } from "@/presentacion/glosario";
import { URL_ASTEROIDES } from "./Asteroides";
import { materialGeoda } from "./geoda";
import { coloresArrasados, geometriaTierra, puntoTierra } from "./tierra";

export const RADIO_PLANETA = 1.45;
// más abajo que antes: los continentes sobresalen del mar y el dino se hundía en ellos
export const CENTRO_PLANETA = new THREE.Vector3(0, -1.48, -0.05);

function azar(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Dónde está parado el dino (Bogotá) y qué queda de frente a la cámara (Brasil y el Atlántico). */
const PARADO_EN = { lat: 4.6, lon: -74.1 };
const HACIA_CAMARA = { lat: -12, lon: -45 };

/** Gira la Tierra para que PARADO_EN quede arriba y HACIA_CAMARA quede de frente. */
export function orientacionTierra() {
  const arriba = new THREE.Vector3(0, 1, 0);
  const q1 = new THREE.Quaternion().setFromUnitVectors(puntoTierra(PARADO_EN.lat, PARADO_EN.lon), arriba);
  const frente = puntoTierra(HACIA_CAMARA.lat, HACIA_CAMARA.lon).applyQuaternion(q1);
  const q2 = new THREE.Quaternion().setFromAxisAngle(arriba, Math.atan2(-frente.x, frente.z));
  return q2.multiply(q1);
}

/** Dónde cae el asteroide de la cinemática: adelante a la derecha del dino, en la cara visible. */
export const NORMAL_IMPACTO = new THREE.Vector3(0.55, 0.75, 0.45).normalize();

/**
 * Segundos desde el choque de la cinemática (-1 = Tierra intacta). Lo escribe Apocalipsis.tsx
 * y lo lee el planeta para quemarse.
 */
export const destruccion = { segundos: -1 };
/** Lo que tarda la ola de fuego en dar la vuelta a la Tierra. */
const OLA = 1.8;

export function Planeta() {
  const geometria = useMemo(() => geometriaTierra(RADIO_PLANETA), []);
  const orientacion = useMemo(orientacionTierra, []);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const ultimo = useRef(-1);
  const datos = useMemo(() => {
    const color = geometria.attributes.color as THREE.BufferAttribute;
    const pos = geometria.attributes.position;
    // el punto del choque, en coordenadas del planeta sin rotar
    const golpe = NORMAL_IMPACTO.clone().applyQuaternion(orientacion.clone().invert());
    const v = new THREE.Vector3();
    const angulo = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) angulo[i] = v.fromBufferAttribute(pos, i).normalize().angleTo(golpe);
    return {
      color,
      sana: Float32Array.from(color.array as Float32Array),
      arrasada: coloresArrasados(geometria, RADIO_PLANETA),
      angulo,
    };
  }, [geometria, orientacion]);

  // la ola de fuego sale del cráter y cubre todo el planeta; después ya no cambia
  useFrame(() => {
    const s = destruccion.segundos < 0 ? -1 : Math.min(destruccion.segundos, OLA);
    if (s === ultimo.current) return;
    ultimo.current = s;
    const ola = s < 0 ? -1 : (s / OLA) * (Math.PI + 0.5);
    const { color, sana, arrasada, angulo } = datos;
    const arr = color.array as Float32Array;
    for (let i = 0; i < angulo.length; i++) {
      const f = ola < 0 ? 0 : Math.min(1, Math.max(0, (ola - angulo[i]) / 0.5));
      for (let k = i * 3; k < i * 3 + 3; k++) arr[k] = sana[k] + (arrasada[k] - sana[k]) * f;
    }
    color.needsUpdate = true;
    // brillo de brasa: todo el planeta queda al rojo
    if (material.current) material.current.emissiveIntensity = s < 0 ? 0 : 0.07 * (s / OLA);
  });

  return (
    <mesh geometry={geometria} position={CENTRO_PLANETA} quaternion={orientacion} receiveShadow>
      <meshStandardMaterial ref={material} vertexColors roughness={0.82} metalness={0} emissive="#ff3010" emissiveIntensity={0} />
    </mesh>
  );
}

/** Punto de la superficie hacia la dirección (az, inc) desde arriba del planeta. */
function sobreElPlaneta(az: number, inc: number, alto = 0) {
  const n = new THREE.Vector3(Math.sin(az), Math.cos(az) * Math.cos(inc), Math.sin(inc) * 0.9 + 0.35).normalize();
  return { n, p: CENTRO_PLANETA.clone().addScaledVector(n, RADIO_PLANETA + alto) };
}

/**
 * Banquito del dino: un pedazo de meteorito aplastado detrás de él (está en pose de sentado).
 * El chiste: el dino descansa sobre lo mismo que extinguió a sus tatarabuelos.
 */
export function Banquito() {
  const { scene } = useGLTF(URL_ASTEROIDES);
  const roca = useMemo(() => {
    const o = scene.getObjectByName("asteroide_2")!.clone(true);
    o.position.set(0, 0, 0);
    o.traverse((m) => {
      const malla = m as THREE.Mesh;
      if (!malla.isMesh) return;
      malla.castShadow = malla.receiveShadow = true;
      // más oscuro que los asteroides colgados: roca quemada de meteorito
      const mat = (malla.material as THREE.MeshStandardMaterial).clone();
      mat.color.set("#8d7f74");
      malla.material = mat;
    });
    return o;
  }, [scene]);
  // la cola le pasa por encima: el centro va un poco atrás de las piernas, hundido en el suelo
  return (
    <group position={[-0.08, 0.04, -0.4]} rotation={[0.1, 0.15, -0.05]} scale={[1.55, 0.62, 0.95]}>
      <primitive object={roca} />
    </group>
  );
}

/** Dónde quedan las geodas: regadas sin orden, cada una con su tamaño, giro e inclinación. */
const REGADAS = [
  { az: -0.9, inc: 0.08, escala: 0.46, giro: 0.4, ladeo: 0.55 },
  { az: 0.36, inc: 0.74, escala: 0.34, giro: 2.3, ladeo: 0.42 },
  { az: -0.28, inc: 1.02, escala: 0.4, giro: 4.1, ladeo: 0.5 },
  { az: 1.02, inc: 0.32, escala: 0.38, giro: 5.4, ladeo: 0.62 },
];
const VISTA = new THREE.Vector3(0, 0.3, 1);

/** Destellito de 4 puntas: titila sobre las geodas boca abajo para invitar a tocarlas. */
function geometriaDestello() {
  const forma = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const r = i % 2 === 0 ? 1 : 0.22;
    if (i === 0) forma.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else forma.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  forma.closePath();
  return new THREE.ShapeGeometry(forma);
}
const VOLTEO = 0.6; // segundos que tarda en dar la vuelta
const suave = (t: number) => t * t * (3 - 2 * t);

type PropsGeodas = {
  /** la geoda abierta en el DOM (null si ninguna) */
  abierta: number | null;
  onAbrir: (i: number) => void;
  quieto: boolean;
};

/**
 * Medias geodas en el piso, boca abajo: parecen piedritas, con apenas un filo de cristal.
 * Al tocarlas saltan, se voltean boca arriba y, cuando caen, se abren en grande (ui/Geoda.tsx).
 * Al cerrar, vuelven a quedar boca abajo.
 */
export function Geodas({ abierta, onAbrir, quieto }: PropsGeodas) {
  const { scene } = useGLTF(URL_ASTEROIDES);
  const invalidate = useThree((s) => s.invalidate);
  const [sobre, setSobre] = useState<number | null>(null);
  const grupos = useRef<(THREE.Group | null)[]>([]);
  // por geoda: hacia dónde va (0 boca abajo, 1 boca arriba), desde cuándo (null = desde ya)
  // y si al terminar debe abrir la grande. Arrancan ya boca abajo, sin animación.
  const volteos = useRef(REGADAS.map(() => ({ objetivo: 0, desde: -1e9 as number | null, avisar: false })));
  // corteza más cálida que la de los asteroides colgados, para que no se confundan con ellos
  const roca = useMemo(() => {
    const copias = new Map<THREE.Material, THREE.Material>();
    return (mat: THREE.Material) => {
      if (!copias.has(mat)) {
        const m = (mat as THREE.MeshStandardMaterial).clone();
        m.color.set("#e0b994");
        copias.set(mat, m);
      }
      return copias.get(mat)!;
    };
  }, []);

  const piezas = useMemo(
    () =>
      REGADAS.map(({ az, inc, escala, giro, ladeo }, i) => {
        const { n, p } = sobreElPlaneta(az, inc, 0.005);
        const X = new THREE.Vector3(1, 0, 0); // la cara cortada del modelo mira a +X
        // boca abajo: la cara mira al suelo, ladeada hacia el público para que asome un filo de cristal
        const t = VISTA.clone().addScaledVector(n, -VISTA.dot(n)).normalize();
        const abajoDir = n.clone().multiplyScalar(-Math.cos(ladeo)).addScaledVector(t, Math.sin(ladeo)).normalize();
        const qAbajo = new THREE.Quaternion().setFromUnitVectors(X, abajoDir);
        qAbajo.premultiply(new THREE.Quaternion().setFromAxisAngle(abajoDir, giro));
        // boca arriba: medio acostada mirando al público
        const cara = n.clone().multiplyScalar(1.2).add(new THREE.Vector3(0, 0.2, 0.75)).normalize();
        const qArriba = new THREE.Quaternion().setFromUnitVectors(X, cara);
        qArriba.premultiply(new THREE.Quaternion().setFromAxisAngle(cara, giro));
        // boca arriba el borde de abajo se hundiría: se sube lo que baja ese borde
        const pArriba = p.clone().addScaledVector(n, 0.5 * escala * Math.sin(n.angleTo(cara)));
        const v = i % 3;
        const geoda = materialGeoda(v);
        const partes: { geometria: THREE.BufferGeometry; material: THREE.Material }[] = [];
        scene.getObjectByName(`mitad_L_${v}`)!.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          const mat = m.material as THREE.Material;
          partes.push({ geometria: m.geometry, material: mat.name.startsWith("geoda") ? geoda : roca(mat) });
        });
        // el destello va encima del lomo de la piedra
        const destello = p.clone().addScaledVector(n, 0.6 * escala).addScaledVector(t, 0.08 * escala);
        return { n, pAbajo: p, pArriba, qAbajo, qArriba, escala, partes, geoda, destello };
      }),
    [scene, roca],
  );
  const formaDestello = useMemo(geometriaDestello, []);
  const destellos = useRef<(THREE.Mesh | null)[]>([]);

  // al cerrar la grande, la del piso se vuelve a voltear; si se abrió con el teclado, se voltea igual
  useEffect(() => {
    volteos.current.forEach((vo, i) => {
      const quiere = abierta === i ? 1 : 0;
      if (vo.objetivo !== quiere) {
        vo.objetivo = quiere;
        vo.desde = null;
        vo.avisar = false;
      }
    });
    invalidate();
  }, [abierta, invalidate]);

  const aux = useMemo(() => ({ p: new THREE.Vector3(), q: new THREE.Quaternion() }), []);

  useFrame(({ clock, camera }) => {
    const t = Math.floor(clock.elapsedTime * FPS_DOSES) / FPS_DOSES;
    const c = cuadroActual(clock.elapsedTime);
    piezas.forEach((g, i) => {
      const brillo = destellos.current[i];
      const grupo = grupos.current[i];
      if (!grupo) return;
      const vo = volteos.current[i];
      if (vo.desde === null) vo.desde = t;
      const avance = quieto ? 1 : Math.min(1, (t - vo.desde) / VOLTEO);
      const k = suave(vo.objetivo ? avance : 1 - avance);
      // salto: sube mientras da la vuelta y cae
      const salto = avance < 1 ? Math.sin(avance * Math.PI) * 0.32 : 0;
      const encima = sobre === i && k < 0.5;
      aux.p.copy(g.pAbajo).lerp(g.pArriba, k).addScaledVector(g.n, salto + (encima ? 0.04 : 0));
      aux.q.copy(g.qAbajo).slerp(g.qArriba, k);
      grupo.position.copy(aux.p);
      grupo.quaternion.copy(aux.q);
      // temblorcito de "tócame" cuando el cursor está encima
      if (encima && !quieto) grupo.rotateY(temblor(c, i + 70, 0.14));
      grupo.scale.setScalar(g.escala * (encima ? 1.12 : 1));
      g.geoda.emissiveIntensity = 0.12 + 0.35 * k;
      // destellito: 3 cuadros cada 3 segundos, cada geoda a destiempo (quieto: fijo y chiquito)
      if (brillo) {
        const fase = (c + i * 11) % 36;
        const tam = quieto ? 0.6 : [0.55, 1, 0.5][fase] ?? 0;
        brillo.visible = k < 0.05 && tam > 0;
        brillo.position.copy(g.destello);
        brillo.quaternion.copy(camera.quaternion);
        brillo.rotateZ(fase * 0.3);
        brillo.scale.setScalar(0.075 * tam);
      }
      // ya cayó boca arriba: ahora sí se abre la grande
      if (vo.avisar && vo.objetivo === 1 && avance >= 1) {
        vo.avisar = false;
        onAbrir(i);
      }
    });
  });

  return (
    <group>
      {GLOSARIO.map((e, i) => (
        <group
          key={e.id}
          ref={(gr) => {
            grupos.current[i] = gr;
          }}
          onPointerOver={(ev: ThreeEvent<PointerEvent>) => {
            ev.stopPropagation();
            setSobre(i);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setSobre(null);
            document.body.style.cursor = "";
          }}
          onClick={(ev: ThreeEvent<MouseEvent>) => {
            ev.stopPropagation();
            const vo = volteos.current[i];
            if (vo.objetivo === 1) return;
            vo.objetivo = 1;
            vo.desde = null;
            // sin movimiento no hay reloj corriendo: se voltea de una y se abre ya
            vo.avisar = !quieto;
            if (quieto) onAbrir(i);
            invalidate();
          }}
        >
          {piezas[i].partes.map((parte, j) => (
            <mesh key={j} geometry={parte.geometria} material={parte.material} castShadow />
          ))}
        </group>
      ))}
      {GLOSARIO.map((e, i) => (
        <mesh
          key={e.id}
          ref={(m) => {
            destellos.current[i] = m;
          }}
          geometry={formaDestello}
          raycast={() => null}
        >
          <meshBasicMaterial color="#fff4c2" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Estrellas de cartón colgadas de hilos, al fondo del set. */
export function Estrellas({ quieto }: { quieto: boolean }) {
  const malla = useRef<THREE.InstancedMesh>(null);
  const datos = useMemo(() => {
    const rnd = azar(5);
    return Array.from({ length: 12 }, () => ({
      p: new THREE.Vector3(-8 + rnd() * 16, 0.8 + rnd() * 3.6, -5.5 - rnd() * 2),
      r: 0.13 + rnd() * 0.15,
      giro: rnd() * Math.PI,
    }));
  }, []);
  const geometria = useMemo(() => {
    const forma = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? 1 : 0.46;
      if (i === 0) forma.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else forma.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    forma.closePath();
    return new THREE.ExtrudeGeometry(forma, { depth: 0.15, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.04, bevelSegments: 2 });
  }, []);
  const hilos = useMemo(() => {
    const puntos: number[] = [];
    for (const d of datos) puntos.push(d.p.x, d.p.y + d.r, d.p.z, d.p.x, d.p.y + 12, d.p.z);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(puntos, 3));
    return g;
  }, [datos]);
  const m = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    if (!malla.current) return;
    const c = quieto ? 0 : cuadroActual(clock.elapsedTime);
    datos.forEach((d, i) => {
      m.position.copy(d.p);
      m.rotation.set(0, Math.sin(c * 0.05 + d.giro) * 0.5, temblor(c, i, 0.02));
      m.scale.setScalar(d.r);
      m.updateMatrix();
      malla.current!.setMatrixAt(i, m.matrix);
    });
    malla.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={malla} args={[geometria, undefined, datos.length]} frustumCulled={false}>
        <meshStandardMaterial color="#e8c46a" roughness={0.95} />
      </instancedMesh>
      <lineSegments geometry={hilos}>
        <lineBasicMaterial color="#d9d2c0" transparent opacity={0.4} />
      </lineSegments>
    </group>
  );
}

/** Luz de maqueta: foco cálido con sombra dura, contraluz frío y relleno azulado. */
export function Luces({ objetivo }: { objetivo: [number, number, number] }) {
  const blanco = useMemo(() => new THREE.Object3D(), []);
  blanco.position.set(...objetivo);
  return (
    <>
      <primitive object={blanco} />
      <hemisphereLight args={["#6f9aa6", "#1c2333", 1.1]} />
      <spotLight
        position={[objetivo[0] + 2.8, objetivo[1] + 6.4, objetivo[2] + 4.2]}
        target={blanco}
        angle={0.5}
        penumbra={0.35}
        intensity={110}
        decay={1.6}
        color="#ffcf94"
        castShadow
        shadow-bias={-0.002}
        shadow-normalBias={0.08}
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-3, 4, -3]} intensity={1.1} color="#8cd9ff" />
      <directionalLight position={[4, 2, 5]} intensity={0.35} color="#ffe2b8" />
    </>
  );
}
