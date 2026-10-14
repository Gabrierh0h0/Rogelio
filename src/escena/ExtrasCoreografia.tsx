/*
 * Utilería 3D de algunas cinemáticas de llegada (escena/coreografias.ts):
 * - gemelos: un segundo asteroide llega por la derecha, choca con el primero y se funde.
 * - cuchillo: un cuchillo de cartón baja de un tajo y corta el asteroide en dos.
 * - folds: el asteroide estalla en 5 pedazos que orbitan; en cada vuelta uno se ilumina
 *   (el fold de prueba), como la validación cruzada de 5 folds. Luego se vuelven a juntar.
 * - telescopio: un telescopio de cartón sale de la Tierra al lado del dino y apunta al papel.
 * - lupa: una lupa de bronce baja y se para frente al asteroide para inspeccionarlo.
 * Lee `estadoCoreo`, que Asteroides.tsx actualiza cada cuadro. Todo en doses.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { TIEMPOS } from "@/presentacion/disposicion";
import { cuadroActual, temblor } from "@/lib/enDoses";
import { estadoCoreo, RADIO_MODELO, suave, TELESCOPIO_LOCAL, tramo } from "./coreografias";
import { URL_ASTEROIDES } from "./Asteroides";
import { usePrecompilar } from "./precompilar";

const N_FOLDS = 5;
const ARRIBA = new THREE.Vector3(0, 1, 0);
const V = TIEMPOS.vuelo;

export function ExtrasCoreografia({ quieto }: { quieto: boolean }) {
  const raiz = useRef<THREE.Group>(null);
  const cuchillo = useRef<THREE.Group>(null);
  const pedazos = useRef<(THREE.Mesh | null)[]>([]);
  const materiales = useMemo(
    () =>
      Array.from(
        { length: N_FOLDS },
        () => new THREE.MeshStandardMaterial({ color: "#d9c7a2", roughness: 0.9, emissive: new THREE.Color("#ffb04a"), emissiveIntensity: 0.18 }),
      ),
    [],
  );
  const geometriaPedazo = useMemo(() => {
    // piedrita de plastilina: icosaedro con bultos
    const g = new THREE.IcosahedronGeometry(1, 2);
    const pos = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      v.multiplyScalar(0.82 + 0.18 * Math.abs(Math.sin(v.x * 5.1 + v.y * 3.7 + v.z * 2.3)));
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  // gemelos: el segundo asteroide (otra variante) que llega por la derecha y se funde con el primero
  const { scene } = useGLTF(URL_ASTEROIDES);
  const gemelo = useMemo(() => {
    const o = scene.getObjectByName("asteroide_0")!.clone(true);
    o.position.set(0, 0, 0);
    o.traverse((m) => {
      if ((m as THREE.Mesh).isMesh) m.castShadow = true;
    });
    return o;
  }, [scene]);
  const grupoGemelo = useRef<THREE.Group>(null);
  const lupa = useRef<THREE.Group>(null);
  const telescopio = useRef<THREE.Group>(null);
  const tubo = useRef<THREE.Group>(null);
  const lente = useRef<THREE.MeshStandardMaterial>(null);
  const aux = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3() }), []);

  // oculta hasta que se usa: se compila al cargar para que el primer tajo no dé un tirón
  usePrecompilar(raiz);

  useFrame(({ clock }) => {
    const { nombre, s, ancla, radio } = estadoCoreo;
    const c = quieto ? 0 : cuadroActual(clock.elapsedTime);

    // --- gemelos: llega por la derecha en arco, choca con el primero y se funde (se encoge dentro)
    const ge = grupoGemelo.current;
    if (ge) {
      ge.visible = !quieto && nombre === "gemelos" && s >= 0.1 && s < V + 0.25;
      if (ge.visible) {
        const llega = suave(tramo(s, 0.1, V - 0.1));
        aux.a.copy(ancla).add(aux.c.set(radio * 5, radio * 0.6, -radio * 0.8));
        aux.b.copy(ancla).add(aux.c.set(radio * 0.95, 0, 0));
        ge.position.copy(aux.a).lerp(aux.b, llega);
        ge.position.y += Math.sin(llega * Math.PI) * radio * 0.9;
        // al chocar se aplasta contra el otro y se mete en él
        const funde = tramo(s, V, 0.25);
        ge.position.lerp(ancla, suave(funde));
        const escala = (radio / (RADIO_MODELO * 1.4)) * 0.85 * (1 - suave(funde));
        const golpe = s >= V + 0.08 && s < V + 0.25;
        ge.scale.set(escala * (golpe ? 1.25 : 1), escala * (golpe ? 0.8 : 1), escala * (golpe ? 1.25 : 1));
        ge.rotation.set(s * 2.4, -s * 1.8, 0);
      }
    }

    // --- telescopio: salta de la Tierra al lado del dino, apunta al papel (el asteroide llega por
    //     esa línea) y se queda mientras dura el paso; el lente brilla cuando lo ve venir
    const te = telescopio.current;
    if (te && tubo.current) {
      te.visible = nombre === "telescopio";
      if (te.visible) {
        te.position.copy(estadoCoreo.isla).add(TELESCOPIO_LOCAL);
        const k = quieto ? 1 : tramo(s, 0, 0.34);
        te.scale.setScalar(1.5 * (k < 1 ? [0.15, 0.62, 1.16, 0.94][Math.min(3, Math.floor(k * 4))] : 1));
        aux.c.copy(ancla).sub(te.position).normalize();
        tubo.current.quaternion.setFromUnitVectors(ARRIBA, aux.c);
        if (lente.current) lente.current.emissiveIntensity = !quieto && s > 0.2 && s < 1.05 ? 1.1 + temblor(c, 31, 0.35) : 0.3;
      }
    }

    // --- lupa: baja desde arriba a la derecha (lejos del dino), se para frente al asteroide,
    //     se bambolea mientras lo "inspecciona" y se va por donde vino
    const lu = lupa.current;
    if (lu) {
      lu.visible = !quieto && nombre === "lupa" && s >= V - 0.2 && s < V + 1.22;
      if (lu.visible) {
        const entra = suave(tramo(s, V - 0.2, 0.42));
        const sale = suave(tramo(s, V + 0.92, 0.3));
        aux.a.copy(ancla).add(aux.c.set(radio * 2.6, radio * 4.6, radio * 1.6));
        aux.b.copy(ancla).add(aux.c.set(0, 0, radio * 1.6));
        lu.position.copy(aux.a).lerp(aux.b, entra).lerp(aux.a, sale);
        lu.rotation.set(0, 0, -0.25 + Math.sin(s * 7) * 0.08 * (1 - sale) + temblor(c, 21, 0.03));
        lu.scale.setScalar(radio);
      }
    }

    // --- cuchillo: entra por arriba, baja de un tajo por el centro y se va por abajo
    const cu = cuchillo.current;
    if (cu) {
      const k = tramo(s, V + 0.08, 0.4);
      cu.visible = !quieto && nombre === "cuchillo" && k > 0 && k < 1;
      if (cu.visible) {
        cu.position.set(ancla.x + temblor(c, 3, 0.02), ancla.y + radio * 2.2 - k * radio * 4.4, ancla.z + radio * 0.35);
        cu.rotation.set(0, 0, -0.12 + k * 0.1);
        cu.scale.setScalar(radio);
      }
    }

    // --- folds: estallan, orbitan con uno iluminado por vuelta, y se vuelven a juntar
    const activo = !quieto && nombre === "folds" && s >= V && s < V + 1.75;
    const u = s - V;
    const anillo = radio * 1.45;
    const prueba = Math.floor(Math.max(0, u - 0.25) / 0.25) % N_FOLDS;
    pedazos.current.forEach((m, i) => {
      if (!m) return;
      m.visible = activo;
      if (!activo) return;
      // radio: sale disparado, se queda en el anillo y al final se junta
      const r = anillo * (u < 0.25 ? suave(u / 0.25) * 1.15 : u > 1.5 ? 1 - suave((u - 1.5) / 0.25) : 1);
      const ang = (i / N_FOLDS) * Math.PI * 2 + u * 2.2;
      m.position.set(ancla.x + Math.cos(ang) * r, ancla.y + Math.sin(ang) * r * 0.85, ancla.z + Math.sin(ang * 2) * radio * 0.15);
      m.rotation.set(u * 3 + i, u * 2 + i * 0.7, 0);
      const esPrueba = u >= 0.25 && u < 1.5 && i === prueba;
      m.scale.setScalar(radio * (esPrueba ? 0.42 : 0.34));
      materiales[i].emissiveIntensity = esPrueba ? 1.1 : 0.18;
      materiales[i].emissive.set(esPrueba ? "#ff6a1a" : "#ffb04a");
    });
  });

  return (
    <group ref={raiz}>
      {/* cuchillo de cartón: hoja plateada y mango de madera (en unidades del radio del asteroide) */}
      <group ref={cuchillo} visible={false}>
        <mesh position={[0, -0.75, 0]} castShadow>
          <boxGeometry args={[0.32, 1.6, 0.05]} />
          <meshStandardMaterial color="#cfd3d6" roughness={0.45} metalness={0.25} />
        </mesh>
        <mesh position={[-0.06, -1.62, 0]} rotation={[0, 0, 0.5]}>
          <boxGeometry args={[0.22, 0.22, 0.05]} />
          <meshStandardMaterial color="#cfd3d6" roughness={0.45} metalness={0.25} />
        </mesh>
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[0.26, 0.62, 0.16]} />
          <meshStandardMaterial color="#7a4a2a" roughness={0.9} />
        </mesh>
      </group>

      {/* telescopio de cartón: trípode de palitos, rótula, tubo con bandas de plastilina roja, lente y ocular */}
      <group ref={telescopio} visible={false}>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2 + 0.5;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.13, -0.29, Math.sin(a) * 0.13]} rotation={[Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3]} castShadow>
              <cylinderGeometry args={[0.02, 0.026, 0.62, 6]} />
              <meshStandardMaterial color="#8a5a2b" roughness={0.9} />
            </mesh>
          );
        })}
        <mesh>
          <sphereGeometry args={[0.065, 12, 10]} />
          <meshStandardMaterial color="#5c4a36" roughness={0.8} />
        </mesh>
        <group ref={tubo}>
          <mesh position={[0, 0.12, 0]} castShadow>
            <cylinderGeometry args={[0.078, 0.062, 0.64, 18]} />
            <meshStandardMaterial color="#c39a62" roughness={0.95} />
          </mesh>
          {[-0.1, 0.2].map((y) => (
            <mesh key={y} position={[0, y, 0]}>
              <cylinderGeometry args={[0.086, 0.086, 0.05, 18]} />
              <meshStandardMaterial color="#b0442c" roughness={0.85} />
            </mesh>
          ))}
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.1, 0.084, 0.07, 18]} />
            <meshStandardMaterial color="#b0442c" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.49, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.08, 18]} />
            <meshStandardMaterial ref={lente} color="#9fd6e6" emissive="#bfefff" emissiveIntensity={0.3} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.24, 0]}>
            <cylinderGeometry args={[0.03, 0.036, 0.13, 10]} />
            <meshStandardMaterial color="#3c2f24" roughness={0.8} />
          </mesh>
        </group>
      </group>

      {/* el gemelo de "gemelos" */}
      <group ref={grupoGemelo} visible={false}>
        <primitive object={gemelo} />
      </group>

      {/* lupa de plastilina: aro de bronce, vidrio apenas azul con un brillo, mango de madera (en unidades del radio) */}
      <group ref={lupa} visible={false}>
        <mesh castShadow>
          <torusGeometry args={[1.18, 0.14, 14, 40]} />
          <meshStandardMaterial color="#c9a24a" roughness={0.55} metalness={0.35} />
        </mesh>
        <mesh>
          <circleGeometry args={[1.12, 40]} />
          <meshStandardMaterial color="#cfeaf2" transparent opacity={0.16} roughness={0.1} depthWrite={false} />
        </mesh>
        <mesh position={[-0.42, 0.45, 0.02]} rotation={[0, 0, 0.7]}>
          <capsuleGeometry args={[0.07, 0.42, 4, 8]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.55} roughness={0.2} depthWrite={false} />
        </mesh>
        <group rotation={[0, 0, -Math.PI * 0.75]}>
          <mesh position={[0, 1.42, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.26, 16]} />
            <meshStandardMaterial color="#a8822f" roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[0, 2.15, 0]} castShadow>
            <capsuleGeometry args={[0.17, 1.1, 6, 12]} />
            <meshStandardMaterial color="#7a4a2a" roughness={0.9} />
          </mesh>
        </group>
      </group>

      {materiales.map((mat, i) => (
        <mesh
          key={i}
          ref={(m) => {
            pedazos.current[i] = m;
          }}
          geometry={geometriaPedazo}
          material={mat}
          visible={false}
          castShadow
        />
      ))}
    </group>
  );
}
