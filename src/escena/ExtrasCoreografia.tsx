/*
 * Utilería 3D de algunas cinemáticas de llegada (escena/coreografias.ts):
 * - cuchillo: un cuchillo de cartón baja de un tajo y corta el asteroide en dos.
 * - folds: el asteroide estalla en 5 pedazos que orbitan; en cada vuelta uno se ilumina
 *   (el fold de prueba), como la validación cruzada de 5 folds. Luego se vuelven a juntar.
 * Lee `estadoCoreo`, que Asteroides.tsx actualiza cada cuadro. Todo en doses.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TIEMPOS } from "@/presentacion/disposicion";
import { cuadroActual, temblor } from "@/lib/enDoses";
import { estadoCoreo, suave, tramo } from "./coreografias";
import { usePrecompilar } from "./precompilar";

const N_FOLDS = 5;
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

  // oculta hasta que se usa: se compila al cargar para que el primer tajo no dé un tirón
  usePrecompilar(raiz);

  useFrame(({ clock }) => {
    const { nombre, s, ancla, radio } = estadoCoreo;
    const c = quieto ? 0 : cuadroActual(clock.elapsedTime);

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
