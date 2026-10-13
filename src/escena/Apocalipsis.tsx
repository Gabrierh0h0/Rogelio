/*
 * Lo que pasa después del choque de la cinemática final, en doses:
 * - Mundo: la Tierra se quema desde el cráter (Set.tsx pinta la ola), se enciende un resplandor
 *   de brasa y el planeta sube hasta la mitad de la pantalla, crece y queda girando para verse entero.
 * - DinoVolador: el golpe lanza al dino dando vueltas hacia el fondo; luego reaparece a lo lejos,
 *   flotando a la deriva, mareado, con estrellitas alrededor de la cabeza.
 * Los dos usan el mismo reloj que el impacto (relojCine.ts).
 */
import { useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CINE, type Fase } from "@/presentacion/cinematica";
import type { Disposicion } from "@/presentacion/disposicion";
import { cuadroActual, FPS_DOSES, temblor } from "@/lib/enDoses";
import { crearReloj, segundosCine } from "./relojCine";
import { usePrecompilar } from "./precompilar";
import { CENTRO_PLANETA, destruccion, RADIO_PLANETA } from "./Set";

const suave = (t: number) => t * t * (3 - 2 * t);
const tramo = (s: number, a: number, d: number) => Math.min(1, Math.max(0, (s - a) / d));

/** Dónde termina cada cosa, en coordenadas de pantalla (-1..1). El mensaje va en el rectángulo del panel. */
const DESTINO = {
  horizontal: { tierra: [-0.45, 0.02], dino: [0.3, 0.7] },
  vertical: { tierra: [0, -0.5], dino: [-0.6, -0.58] },
} as const;

/** Punto que se ve en (x, y) de pantalla a cierta distancia de la cámara, en coordenadas de la isla. */
function enPantalla(
  [x, y]: readonly [number, number],
  distancia: number,
  camara: THREE.Camera,
  isla: THREE.Vector3,
  salida: THREE.Vector3,
) {
  salida.set(x, y, 0.5).unproject(camara).sub(camara.position).normalize();
  return salida.multiplyScalar(distancia).add(camara.position).sub(isla);
}

/** Resplandor rojo de brasa alrededor del planeta (gradiente dibujado una vez). */
function texturaBrasa() {
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = 256;
  const ctx = lienzo.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 40, 128, 128, 128);
  g.addColorStop(0, "rgba(255,110,40,0.95)");
  g.addColorStop(0.45, "rgba(230,60,20,0.55)");
  g.addColorStop(1, "rgba(120,20,10,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(lienzo);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

type Props = { fase: Fase; quieto: boolean; disp: Disposicion; children: ReactNode };

export function Mundo({ fase, quieto, disp, children }: Props) {
  const camara = useThree((s) => s.camera);
  const pivote = useRef<THREE.Group>(null);
  const giro = useRef<THREE.Group>(null);
  const brasa = useRef<THREE.Sprite>(null);
  const reloj = useRef(crearReloj());
  const isla = useMemo(() => new THREE.Vector3(...disp.isla), [disp]);
  const textura = useMemo(texturaBrasa, []);
  usePrecompilar(pivote);
  const aux = useMemo(() => ({ destino: new THREE.Vector3(), centro: new THREE.Vector3() }), []);

  useFrame(({ clock }) => {
    const pv = pivote.current;
    const gi = giro.current;
    const br = brasa.current;
    if (!pv || !gi || !br) return;
    const t = Math.floor(clock.elapsedTime * FPS_DOSES) / FPS_DOSES;
    const s = segundosCine(reloj.current, fase, quieto, t);
    if (s === null) {
      destruccion.segundos = -1;
      pv.position.copy(CENTRO_PLANETA);
      pv.scale.setScalar(1);
      gi.rotation.set(0, 0, 0);
      br.visible = false;
      return;
    }
    const d = s - CINE.impacto;
    destruccion.segundos = d < 0 ? -1 : d;

    // sube hasta la mitad de la pantalla y crece un poco
    const k = suave(tramo(s, CINE.despues, CINE.final - CINE.despues));
    aux.centro.copy(CENTRO_PLANETA).add(isla);
    enPantalla(DESTINO[disp.modo].tierra, camara.position.distanceTo(aux.centro), camara, isla, aux.destino);
    pv.position.copy(CENTRO_PLANETA).lerp(aux.destino, k);
    pv.scale.setScalar(1 + 0.3 * k);
    // y gira, para que se vea toda arrasada (arranca despacio)
    const g = Math.max(0, s - CINE.despues);
    gi.rotation.set(0.3 * k, g < 1 ? 0.25 * g * g : 0.25 + 0.5 * (g - 1), 0);

    // resplandor de brasa: crece con el incendio y respira un poquito
    const calor = d < 0 ? 0 : Math.min(1, d / 1.8);
    br.visible = calor > 0;
    br.material.opacity = calor * (0.5 + temblor(cuadroActual(clock.elapsedTime), 90, quieto ? 0 : 0.08));
  });

  return (
    <group ref={pivote} position={CENTRO_PLANETA}>
      <sprite ref={brasa} scale={RADIO_PLANETA * 3.4} position={[0, 0, -0.8]} visible={false}>
        <spriteMaterial map={textura} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <group ref={giro}>
        <group position={CENTRO_PLANETA.clone().negate()}>{children}</group>
      </group>
    </group>
  );
}

/** Altura del centro del dino (desde sus pies): ahí gira cuando sale volando. */
const CENTRO_DINO = 0.95;
/** Segundos que se le ve volando después del choque (después hace "ting" y desaparece). */
const VUELO = 1.8;
const TING = 0.35;
/** Cuándo reaparece flotando al fondo. */
const DERIVA = CINE.final - 0.9;

function geometriaEstrella() {
  const forma = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 1 : 0.45;
    if (i === 0) forma.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else forma.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  forma.closePath();
  return new THREE.ExtrudeGeometry(forma, { depth: 0.3, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.1, bevelSegments: 1 });
}

export function DinoVolador({ fase, quieto, disp, children }: Props) {
  const camara = useThree((s) => s.camera);
  const exterior = useRef<THREE.Group>(null);
  const mareo = useRef<THREE.Group>(null);
  const cuerpo = useRef<THREE.Group>(null);
  const ting = useRef<THREE.Mesh>(null);
  const luz = useRef<THREE.PointLight>(null);
  const reloj = useRef(crearReloj());
  const isla = useMemo(() => new THREE.Vector3(...disp.isla), [disp]);
  const estrella = useMemo(geometriaEstrella, []);
  usePrecompilar(exterior);
  const aux = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const ex = exterior.current;
    const mr = mareo.current;
    const cu = cuerpo.current;
    const ti = ting.current;
    const lz = luz.current;
    if (!ex || !mr || !cu || !ti || !lz) return;
    const t = Math.floor(clock.elapsedTime * FPS_DOSES) / FPS_DOSES;
    const c = quieto ? 0 : cuadroActual(clock.elapsedTime);
    const s = segundosCine(reloj.current, fase, quieto, t);
    ex.visible = true;
    cu.visible = true;
    mr.visible = false;
    ti.visible = false;
    lz.intensity = 0;

    // en su lugar, sentado en el banquito
    if (s === null || s < CINE.impacto) {
      ex.position.set(0, CENTRO_DINO, 0);
      ex.rotation.set(0, 0, 0);
      ex.scale.setScalar(1);
      return;
    }

    // ¡sale volando! dando vueltas como trompo, hacia el fondo arriba a la derecha,
    // achicándose hasta perderse con un "ting" de estrellita (allá mismo reaparece después)
    const d = s - CINE.impacto;
    if (d < VUELO + TING) {
      const dv = Math.min(d, VUELO);
      ex.position.set(3.4 * dv, CENTRO_DINO + 4.6 * dv - 1.4 * dv * dv, -9 * dv);
      ex.rotation.set(dv * 3, dv * 1.2, -dv * 8);
      // estirado por el golpe los primeros cuadros
      const [ancho, alto] = d < 0.35 ? [0.82, 1.28] : [1, 1];
      ex.scale.set(ancho, alto, ancho);
      if (d >= VUELO) {
        cu.visible = false;
        ti.visible = true;
        const k = (d - VUELO) / TING;
        ti.scale.setScalar(0.9 * Math.sin(k * Math.PI) + 0.2);
        // de frente a la cámara aunque el dino venga girando
        ti.quaternion.copy(ex.quaternion).invert();
        ti.rotateZ(k * 2);
      }
      return;
    }

    // ya se fue: no se ve hasta que reaparece
    if (s < DERIVA) {
      ex.visible = false;
      return;
    }

    // a la deriva al fondo: entra despacio desde un lado y queda flotando, dando vueltas lentas
    const u = s - DERIVA;
    enPantalla(DESTINO[disp.modo].dino, 21, camara, isla, aux);
    const llega = 1 - suave(Math.min(1, u / 2.4));
    aux.x += 4 * llega + Math.sin(u * 0.4) * 0.3;
    aux.y += 1.2 * llega + Math.sin(u * 0.55) * 0.25;
    ex.position.copy(aux);
    ex.rotation.set(0.18 * Math.sin(u * 0.3), 0.5 * Math.sin(u * 0.23), 0.6 + 0.3 * u);
    ex.scale.setScalar(0.9);
    // allá atrás no le llega el foco del set: una luz cálida propia para que se vea
    lz.intensity = 14;
    // estrellitas de mareo dando vueltas sobre la cabeza
    mr.visible = true;
    mr.rotation.y = c * 0.45;
  });

  return (
    <group ref={exterior} position={[0, CENTRO_DINO, 0]}>
      <pointLight ref={luz} position={[1.2, 1.5, 3]} color="#ffd9a8" intensity={0} distance={3.6} decay={1.4} />
      {/* el "ting" del final del vuelo, mirando a la cámara */}
      <mesh ref={ting} geometry={estrella} visible={false}>
        <meshBasicMaterial color="#fff2b0" toneMapped={false} />
      </mesh>
      <group ref={cuerpo} position={[0, -CENTRO_DINO, 0]}>
        {children}
        <group ref={mareo} position={[0, 2.5, 0.35]} visible={false}>
          {[0, 1, 2].map((k) => (
            <mesh
              key={k}
              geometry={estrella}
              position={[Math.cos((k * Math.PI * 2) / 3) * 0.55, Math.sin(k * 2.1) * 0.08, Math.sin((k * Math.PI * 2) / 3) * 0.55]}
              scale={0.11}
            >
              <meshStandardMaterial color="#ffd84a" emissive="#ffb21a" emissiveIntensity={0.6} roughness={0.8} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}
