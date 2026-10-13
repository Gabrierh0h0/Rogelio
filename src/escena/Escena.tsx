/*
 * La escena 3D a pantalla completa, detrás de la interfaz.
 * El canvas es transparente: el fondo del set lo pinta el CSS, así no hay dos tonos
 * distintos entre la web y el 3D. Se dibuja en doses (12 fps) y se detiene si la pestaña
 * no está visible.
 */
import { Suspense, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RelojEnDoses, temblor } from "@/lib/enDoses";
import { disposicion } from "@/presentacion/disposicion";
import { DIAPOSITIVAS } from "@/presentacion/diapositivas";
import { REACCION_FASE, type Fase } from "@/presentacion/cinematica";
import { Impacto, sacudida } from "./Impacto";
import { DinoVolador, Mundo } from "./Apocalipsis";
import { Dino } from "./Dino";
import { Asteroides } from "./Asteroides";
import { Banquito, Estrellas, Geodas, Luces, Planeta } from "./Set";

type Props = {
  indice: number;
  quieto: boolean;
  onElegir: (i: number) => void;
  onSobre: (i: number | null, x: number, y: number) => void;
  onGeoda: (i: number) => void;
  /** geoda del glosario abierta en el DOM (null si ninguna) */
  geoda: number | null;
  /** Se llama una vez, cuando los modelos terminaron de cargar. */
  onListo: () => void;
  /** fase de la cinemática final ("inactiva" el resto del tiempo) */
  fase: Fase;
};

function usePestanaVisible() {
  return useSyncExternalStore(
    (cb) => {
      document.addEventListener("visibilitychange", cb);
      return () => document.removeEventListener("visibilitychange", cb);
    },
    () => document.visibilityState === "visible",
  );
}

function Contenido({ indice, quieto, onElegir, onSobre, onGeoda, geoda, onListo, fase }: Props) {
  const size = useThree((s) => s.size);
  const camara = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const disp = useMemo(() => disposicion(size.width, size.height), [size.width, size.height]);
  const posActiva = useRef<THREE.Vector3 | null>(null);
  const mira = useMemo(() => new THREE.Vector3(...disp.camara.mira), [disp]);

  // cámara fija de maqueta con un leve paralaje del cursor, en pasos discretos
  useFrame(({ pointer }) => {
    const [x, y, z] = disp.camara.posicion;
    const k = quieto ? 0 : 1;
    const px = Math.round(pointer.x * 6) / 6;
    const py = Math.round(pointer.y * 6) / 6;
    // temblor del choque final (la amplitud la pone Impacto.tsx)
    const golpe = sacudida.valor;
    const cq = Math.floor(performance.now() / 83);
    camara.position.set(x + px * 0.3 * k + temblor(cq, 61, golpe), y + py * 0.15 * k + temblor(cq, 62, golpe), z);
    if (camara.fov !== disp.camara.fov) {
      camara.fov = disp.camara.fov;
      camara.updateProjectionMatrix();
    }
    camara.lookAt(mira);
  });

  const isla = disp.isla;
  return (
    <>
      <Luces objetivo={[isla[0], isla[1] + 1, isla[2]]} />
      <Estrellas quieto={quieto} />
      {/* todo lo que depende de los GLB entra junto, cuando ya cargaron */}
      <Suspense fallback={null}>
        <group position={isla}>
          {/* la Tierra, con todo lo que está pegado a ella, se arrasa, sube y gira en la cinemática */}
          <Mundo fase={fase} quieto={quieto} disp={disp}>
            <Planeta />
            <Impacto fase={fase} quieto={quieto} mirada={posActiva} />
            {/* el banquito y las geodas se volatilizan con el choque */}
            {(fase === "inactiva" || fase === "acercando") && (
              <>
                <Banquito />
                <Geodas abierta={geoda} onAbrir={onGeoda} quieto={quieto} />
              </>
            )}
          </Mundo>
          {/* y el dino sale volando con el golpe */}
          <DinoVolador fase={fase} quieto={quieto} disp={disp}>
            <Dino reaccion={fase === "inactiva" ? DIAPOSITIVAS[indice].reaccion : REACCION_FASE[fase]} mirada={posActiva} quieto={quieto} />
          </DinoVolador>
        </group>
        <Asteroides
          // durante la cinemática ningún asteroide queda abierto: todos vuelven a su órbita
          indice={fase === "inactiva" ? indice : -1}
          disp={disp}
          quieto={quieto}
          onElegir={onElegir}
          onSobre={onSobre}
          posActiva={posActiva}
        />
        <AvisaListo onListo={onListo} />
      </Suspense>
    </>
  );
}

function AvisaListo({ onListo }: { onListo: () => void }) {
  useEffect(() => onListo(), [onListo]);
  return null;
}

export default function Escena(props: Props) {
  const visible = usePestanaVisible();
  return (
    <Canvas
      className="!fixed inset-0"
      frameloop="demand"
      dpr={[1, 1.5]}
      shadows
      gl={{ antialias: true, alpha: true, toneMapping: THREE.NeutralToneMapping }}
      camera={{ fov: 35, near: 0.1, far: 60, position: [0, 0.35, 9.2] }}
      onPointerMissed={() => props.onSobre(null, 0, 0)}
      onCreated={(estado) => {
        // solo en desarrollo: deja la escena a mano para depurar desde la consola
        if (import.meta.env.DEV) (window as unknown as { __r3f: unknown }).__r3f = estado;
      }}
      aria-hidden
    >
      <RelojEnDoses activo={!props.quieto && visible} />
      <Contenido {...props} />
    </Canvas>
  );
}
