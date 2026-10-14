/*
 * Cómo llega el asteroide del paso actual en cada cinemática (presentacion/coreografias.ts).
 * Cada coreografía escribe una "pose" a partir de los segundos desde el cambio de paso: dónde
 * está, su tamaño (con aplastamiento por eje), cuánto se abre y cómo se mueven sus mitades.
 * Asteroides.tsx la aplica; la utilería (cuchillo, pedazos de los folds) está en
 * ExtrasCoreografia.tsx y lee `estadoCoreo`. Con "reducir movimiento" s es grande: todas
 * terminan en el mismo lugar, abiertas detrás del papel.
 */
import * as THREE from "three";
import type { Cinematica } from "@/presentacion/diapositivas";
import { TIEMPOS } from "@/presentacion/disposicion";

export const APERTURA = THREE.MathUtils.degToRad(72);
/** radio del modelo de asteroide (sin los bultos, que lo agrandan ~40%) */
export const RADIO_MODELO = 0.42;

export const suave = (t: number) => t * t * (3 - 2 * t);
export const rebote = (t: number) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
export const tramo = (s: number, a: number, d: number) => Math.min(1, Math.max(0, (s - a) / d));
/** cae y rebota contra el piso (ease-out bounce) */
function rebotin(t: number) {
  const n = 7.5625;
  const d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
}

export type Pose = {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  escala: number;
  /** multiplicador por eje (amasar, aplastar al caer) */
  estira: THREE.Vector3;
  /** 0 cerrado · 1 abierto */
  abre: number;
  /** giro de la mitad derecha por unidad de apertura (la izquierda va en espejo) */
  giro: THREE.Vector3;
  /** desplazamiento de la mitad derecha (en unidades del modelo) por unidad de apertura */
  desplazo: THREE.Vector3;
  /** si el desplazamiento vertical también va en espejo (corte en diagonal) */
  espejoY: boolean;
  hilo: boolean;
  oculto: boolean;
  sacude: boolean;
};

export type Ctx = {
  s: number;
  orbita: THREE.Vector3;
  quatOrbita: THREE.Quaternion;
  enOrbita: number;
  ancla: THREE.Vector3;
  escalaAbierta: number;
  separacion: number;
  camara: THREE.Vector3;
  /** dónde están las manos del dino (para atraparlo) */
  manos: THREE.Vector3;
  /** dónde está el telescopio de cartón (cinemática "telescopio") */
  telescopio: THREE.Vector3;
};

/** la rótula del telescopio de cartón, sobre su trípode en la Tierra a la derecha del dino (respecto a la isla) */
export const TELESCOPIO_LOCAL = new THREE.Vector3(1.0, 0.04, 0.42);

/** Lo que necesita la utilería 3D de las coreografías (lo escribe Asteroides.tsx cada cuadro). */
export const estadoCoreo = {
  nombre: "geoda" as Cinematica,
  s: 99,
  ancla: new THREE.Vector3(),
  /** radio en el mundo del asteroide abierto */
  radio: 1,
  /** posición de la isla (dino + Tierra) en el mundo */
  isla: new THREE.Vector3(),
};

export function nuevaPose(): Pose {
  return {
    pos: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    escala: 1,
    estira: new THREE.Vector3(1, 1, 1),
    abre: 0,
    giro: new THREE.Vector3(0, APERTURA, 0),
    desplazo: new THREE.Vector3(),
    espejoY: false,
    hilo: true,
    oculto: false,
    sacude: false,
  };
}

export function reiniciarPose(p: Pose, separacion: number) {
  p.estira.set(1, 1, 1);
  p.abre = 0;
  p.giro.set(0, APERTURA, 0);
  p.desplazo.set(separacion, 0, 0);
  p.espejoY = false;
  p.hilo = true;
  p.oculto = false;
  p.sacude = false;
}

const IDENTIDAD = new THREE.Quaternion();
const aux = { a: new THREE.Vector3(), b: new THREE.Vector3(), e: new THREE.Euler(), q: new THREE.Quaternion() };
const { vuelo: V, temblor: T, apertura: A } = TIEMPOS;

/** Vuela de la órbita a `destino` entre t0 y t0+dur, con anticipación (retrocede antes de salir). */
function volar(c: Ctx, p: Pose, t0: number, dur: number, destino = c.ancla) {
  const v = suave(tramo(c.s, t0, dur));
  const antes = c.s - t0;
  const retro = antes >= 0 && antes < dur * 0.2 ? 0.3 * Math.sin((antes / (dur * 0.2)) * Math.PI) : 0;
  p.pos.copy(c.orbita).lerp(destino, v);
  p.pos.z -= retro;
  p.escala = c.enOrbita + (c.escalaAbierta - c.enOrbita) * v;
  p.quat.copy(c.quatOrbita).slerp(IDENTIDAD, v);
  p.hilo = v < 0.01;
  return v;
}

/** Ya en el ancla, cerrado y de frente. */
function enAncla(c: Ctx, p: Pose) {
  p.pos.copy(c.ancla);
  p.escala = c.escalaAbierta;
  p.quat.identity();
  p.hilo = false;
}

const POSES: Record<Cinematica, (c: Ctx, p: Pose) => void> = {
  // la de siempre: vuela, tiembla y se abre como geoda
  geoda(c, p) {
    volar(c, p, 0, V);
    p.sacude = c.s >= V && c.s < V + T;
    p.abre = rebote(tramo(c.s, V + T, A));
  },

  // baja colgado de su hilo como una marioneta, rebota al frenar y se abre
  marioneta(c, p) {
    const k = rebotin(tramo(c.s, 0, 0.95));
    aux.a.copy(c.ancla).add(aux.b.set(0, 2.8, 0));
    p.pos.copy(aux.a).lerp(c.ancla, k);
    p.escala = c.escalaAbierta;
    p.quat.setFromEuler(aux.e.set(0, 0, Math.sin(c.s * 9) * 0.16 * (1 - tramo(c.s, 0, 1.1))));
    p.hilo = c.s < 1.05;
    p.abre = rebote(tramo(c.s, 1.05, A));
  },

  // cae de lo alto, se aplasta al aterrizar, se tambalea y se agrieta como un huevo
  huevo(c, p) {
    const vuelo = 0.6;
    aux.a.copy(c.ancla).add(aux.b.set(0, 0.9, 0));
    if (c.s < vuelo) {
      volar(c, p, 0, vuelo, aux.a);
      return;
    }
    enAncla(c, p);
    const caida = tramo(c.s, vuelo, 0.2);
    p.pos.copy(aux.a).lerp(c.ancla, caida * caida);
    const suelo = c.s - vuelo - 0.2;
    if (suelo >= 0 && suelo < 0.17) p.estira.set(1.15, 0.78, 1.15);
    if (suelo >= 0 && suelo < 0.45) {
      p.quat.setFromEuler(aux.e.set(0, 0, Math.sin(suelo * 32) * 0.13 * (1 - suelo / 0.45)));
    }
    p.giro.set(0.1, 0.25, -1.05);
    p.desplazo.y = -0.12;
    p.desplazo.x *= 0.5;
    p.abre = rebote(tramo(c.s, vuelo + 0.68, 0.4));
  },

  // dos asteroides (uno por fuente) llegan de lados opuestos, chocan, se funden en uno y se abre.
  // El gemelo que llega por la derecha es utilería (ExtrasCoreografia.tsx).
  gemelos(c, p) {
    const radio = RADIO_MODELO * 1.4 * c.escalaAbierta;
    aux.a.copy(c.ancla).add(aux.b.set(-radio * 0.95, 0, 0));
    if (c.s < V) {
      volar(c, p, 0, V, aux.a);
      return;
    }
    enAncla(c, p);
    p.pos.copy(aux.a).lerp(c.ancla, suave(tramo(c.s, V, 0.2)));
    const choque = c.s - V;
    if (choque >= 0.1 && choque < 0.3) p.estira.set(1.24, 0.82, 1.24);
    else if (choque >= 0.3 && choque < 0.45) p.estira.set(0.9, 1.13, 0.9);
    p.abre = rebote(tramo(c.s, V + 0.52, A));
  },

  // se aplasta como masa (en doses), salta de vuelta y se abre
  tajadas(c, p) {
    volar(c, p, 0, V);
    const m = c.s - V;
    if (m >= 0 && m < 0.6) {
      const cuadro = Math.min(3, Math.floor(m / (2 / 12)));
      const alto = [0.78, 0.55, 0.4, 0.36][cuadro];
      const ancho = [1.15, 1.35, 1.52, 1.58][cuadro];
      p.estira.set(ancho, alto, ancho);
    } else if (m >= 0.6 && m < 0.8) {
      p.estira.set(0.9, 1.16, 0.9);
    }
    p.abre = rebote(tramo(c.s, V + 0.82, A));
  },

  // un cuchillo de cartón lo corta de arriba abajo y las mitades se deslizan en diagonal
  cuchillo(c, p) {
    volar(c, p, 0, V);
    p.giro.set(0, APERTURA * 0.55, 0.14);
    p.desplazo.y = -0.2;
    p.espejoY = true;
    p.abre = suave(tramo(c.s, V + 0.48, 0.42));
  },

  // el dino saca un telescopio de cartón; el asteroide llega desde lejos, justo por donde apunta
  telescopio(c, p) {
    const k = tramo(c.s, 0.2, 0.8);
    aux.a.copy(c.ancla).sub(c.telescopio).normalize().multiplyScalar(22).add(c.ancla);
    p.pos.copy(aux.a).lerp(c.ancla, k * k * k);
    p.escala = c.escalaAbierta;
    aux.q.setFromEuler(aux.e.set(c.s * 3, c.s * 2, 0));
    p.quat.copy(aux.q).slerp(IDENTIDAD, k);
    p.hilo = false;
    p.abre = rebote(tramo(c.s, 1.05, A));
  },

  // estalla en 5 pedazos que orbitan (los folds); se vuelve a juntar y se abre
  folds(c, p) {
    volar(c, p, 0, V);
    const fin = V + 1.75;
    if (c.s >= V && c.s < fin) p.oculto = true;
    p.abre = rebote(tramo(c.s, fin + 0.05, A));
  },

  // llega y tiembla mientras la perilla del umbral se mueve
  perilla(c, p) {
    volar(c, p, 0, V);
    p.sacude = c.s >= V && c.s < V + 0.9;
    p.abre = rebote(tramo(c.s, V + 0.9, A));
  },

  // una lupa de bronce baja y lo inspecciona: se ve aumentado y tiembla; luego se abre
  lupa(c, p) {
    volar(c, p, 0, V);
    const bajo = c.s >= V + 0.22 && c.s < V + 0.92;
    if (bajo) p.estira.setScalar(1.2);
    p.sacude = c.s >= V + 0.35 && c.s < V + 0.85;
    p.abre = rebote(tramo(c.s, V + 0.95, A));
  },

  // aparece girando desde un remolino, como si llegara del futuro
  calendario(c, p) {
    if (c.s < 0.9) {
      p.oculto = true;
      p.hilo = false;
      return;
    }
    enAncla(c, p);
    const k = suave(tramo(c.s, 0.9, 0.5));
    p.escala = c.escalaAbierta * Math.max(0.02, k);
    p.quat.setFromEuler(aux.e.set(0, 0, (1 - k) * 12));
    p.abre = rebote(tramo(c.s, 1.45, A));
  },

  // vuela a las manos del dino, que lo atrapa; lo lanza hacia arriba y se abre
  atrapa(c, p) {
    const chico = 0.36;
    if (c.s < 0.85) {
      const v = suave(tramo(c.s, 0, 0.85));
      p.pos.copy(c.orbita).lerp(c.manos, v);
      p.pos.y += Math.sin(v * Math.PI) * 0.7;
      p.escala = c.enOrbita + (chico - c.enOrbita) * v;
      p.quat.copy(c.quatOrbita).slerp(IDENTIDAD, v);
      p.hilo = v < 0.01;
      return;
    }
    p.hilo = false;
    if (c.s < 1.5) {
      // en las manos: rebota un poquito
      p.pos.copy(c.manos);
      p.pos.y += Math.abs(Math.sin((c.s - 0.85) * 9)) * 0.06 * (1 - tramo(c.s, 0.85, 0.65));
      p.escala = chico;
      p.quat.identity();
      return;
    }
    const k = suave(tramo(c.s, 1.5, 0.55));
    p.pos.copy(c.manos).lerp(c.ancla, k);
    p.pos.y += Math.sin(k * Math.PI) * 1.3;
    p.escala = chico + (c.escalaAbierta - chico) * k;
    aux.q.setFromEuler(aux.e.set(c.s * 7, c.s * 4, 0));
    p.quat.copy(aux.q).slerp(IDENTIDAD, k);
    p.abre = rebote(tramo(c.s, 2.08, A));
  },
};

export function poseActiva(nombre: Cinematica, c: Ctx, p: Pose) {
  POSES[nombre](c, p);
}
