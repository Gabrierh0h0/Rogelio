/*
 * La Tierra de plastilina: continentes reconocibles (contornos aproximados en lon/lat),
 * costas irregulares (ruido, como amasadas a mano), tierra en relieve sobre el mar,
 * desiertos, hielo en los polos y agua más clara cerca de la costa.
 * Todo se calcula una vez al crear la geometría.
 */
import * as THREE from "three";

type Poligono = [number, number][]; // [lon, lat]

const TIERRA: Poligono[] = [
  // Norteamérica
  [[-168,66],[-162,70],[-140,70],[-125,70],[-95,72],[-80,73],[-62,66],[-55,52],[-66,45],[-70,41],[-76,35],[-81,31],[-80,25],[-82,28],[-84,30],[-90,29],[-97,26],[-97,21],[-92,18],[-88,21],[-87,16],[-83,15],[-83,10],[-79,9],[-77,8],[-81,8],[-85,11],[-88,13],[-92,15],[-96,16],[-105,20],[-106,23],[-110,24],[-112,29],[-115,31],[-117,32],[-120,34],[-124,40],[-124,46],[-123,49],[-130,54],[-135,58],[-145,60],[-152,59],[-158,57],[-165,55],[-160,59],[-165,62]],
  // Groenlandia
  [[-55,60],[-43,60],[-35,65],[-22,70],[-18,77],[-25,82],[-45,83],[-60,82],[-70,78],[-58,75],[-53,68]],
  // Cuba
  [[-85,22],[-80,23],[-74,20],[-77,20],[-82,22]],
  // Sudamérica
  [[-78,8],[-72,12],[-62,11],[-52,5],[-50,0],[-44,-2],[-35,-5],[-35,-9],[-39,-15],[-40,-22],[-48,-26],[-53,-34],[-58,-38],[-63,-41],[-65,-46],[-69,-51],[-68,-55],[-73,-53],[-75,-46],[-73,-37],[-71,-30],[-70,-18],[-76,-14],[-81,-6],[-80,-2],[-80,1],[-77,4]],
  // Eurasia (Europa, Asia, Arabia, India, Indochina)
  [[-9,37],[-9,43],[-2,44],[-1,46],[-5,48],[2,51],[5,53],[8,54],[9,57],[11,56],[12,54],[20,55],[22,59],[28,60],[24,65],[20,63],[17,60],[18,56],[13,55],[11,59],[5,58],[5,62],[12,66],[18,70],[25,71],[30,70],[40,67],[44,68],[55,69],[60,70],[70,73],[80,73],[90,76],[105,78],[115,74],[130,72],[140,72],[160,70],[175,69],[180,66],[178,62],[170,60],[163,58],[162,55],[156,51],[156,57],[150,59],[142,59],[136,55],[140,48],[135,43],[130,42],[129,36],[126,35],[126,38],[122,40],[121,37],[119,35],[122,31],[120,26],[116,23],[110,21],[106,20],[108,16],[109,12],[105,9],[103,10],[101,13],[100,7],[103,2],[101,2],[98,8],[98,16],[94,17],[92,22],[89,22],[86,20],[80,15],[80,10],[77,8],[76,11],[73,17],[72,22],[67,25],[62,25],[57,26],[56,24],[59,22],[55,17],[52,16],[45,13],[43,13],[39,20],[35,28],[34,31],[35,36],[32,37],[28,37],[27,40],[26,41],[23,40],[23,37],[20,40],[19,42],[16,43],[13,46],[12,44],[15,41],[16,38],[12,38],[12,42],[9,44],[6,43],[3,43],[3,42],[0,40],[-1,37],[-5,36]],
  // Gran Bretaña, Irlanda, Islandia
  [[-6,50],[1,51],[2,53],[-1,55],[-2,58],[-6,58],[-5,55],[-3,54],[-5,52]],
  [[-10,52],[-6,52],[-6,55],[-8,55],[-10,54]],
  [[-24,64],[-14,64],[-14,66],[-22,66]],
  // Japón
  [[130,31],[132,34],[135,34],[140,35],[141,38],[142,42],[145,44],[141,45],[140,41],[139,38],[136,37],[133,35]],
  // África y Madagascar
  [[-17,21],[-16,28],[-9,32],[-6,36],[0,36],[10,37],[11,33],[20,31],[25,32],[32,31],[34,28],[37,22],[39,15],[43,12],[51,12],[49,6],[42,-1],[40,-10],[40,-16],[35,-24],[32,-28],[27,-34],[20,-35],[18,-32],[15,-26],[12,-17],[13,-11],[9,-1],[9,4],[5,6],[-2,5],[-8,4],[-13,8],[-17,14]],
  [[44,-25],[47,-25],[50,-15],[49,-12],[44,-16]],
  // Indonesia, Filipinas, Nueva Guinea
  [[95,5],[98,4],[106,-6],[104,-6],[96,2]],
  [[109,2],[114,4],[118,6],[119,1],[116,-4],[110,-3]],
  [[105,-6],[114,-7],[114,-8],[106,-7]],
  [[131,-1],[138,-1],[147,-6],[150,-10],[143,-9],[138,-8],[132,-4]],
  [[120,18],[122,18],[126,8],[124,6],[121,13]],
  // Australia, Tasmania, Nueva Zelanda
  [[114,-22],[122,-18],[126,-14],[130,-12],[136,-12],[136,-15],[140,-17],[142,-11],[146,-19],[153,-25],[153,-29],[150,-37],[146,-39],[140,-38],[136,-35],[132,-32],[124,-34],[115,-34],[115,-26]],
  [[145,-41],[148,-41],[148,-43],[146,-43]],
  [[172,-34],[178,-38],[175,-41],[171,-46],[167,-46],[171,-42],[174,-39]],
];

const AGUA_INTERIOR: Poligono[] = [
  [[-95,58],[-88,56],[-80,55],[-78,62],[-85,64],[-93,63]], // bahía de Hudson
  [[28,41],[29,45],[33,46],[37,47],[41,42],[36,41]], // mar Negro
  [[47,46],[52,47],[54,41],[53,37],[49,38],[47,42]], // mar Caspio
];

// desiertos (cajas lon/lat): Sahara, Arabia, Australia interior, Gobi, Atacama, suroeste de EE. UU.
const DESIERTOS: [number, number, number, number][] = [
  [-15, 15, 32, 31],
  [36, 15, 56, 30],
  [118, -31, 140, -19],
  [92, 38, 112, 46],
  [-71, -28, -68, -18],
  [-117, 28, -105, 37],
];

function dentro(lon: number, lat: number, pol: Poligono) {
  let adentro = false;
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const [xi, yi] = pol[i];
    const [xj, yj] = pol[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) adentro = !adentro;
  }
  return adentro;
}

/** Ruido de valor 3D suave (para costas, relieve y manchas de color). */
function hash3(x: number, y: number, z: number) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return h - Math.floor(h);
}
function ruido(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const s = (t: number) => t * t * (3 - 2 * t);
  const u = s(xf), v = s(yf), w = s(zf);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
    l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  );
}
function fbm(p: THREE.Vector3, escala: number) {
  let total = 0, amp = 0.5, f = escala;
  for (let o = 0; o < 4; o++) {
    total += amp * ruido(p.x * f, p.y * f, p.z * f);
    f *= 2.1;
    amp *= 0.5;
  }
  return total; // ~0..1
}

function esTierra(lon: number, lat: number) {
  if (lat < -68) return true; // Antártida
  if (!TIERRA.some((pol) => dentro(lon, lat, pol))) return false;
  return !AGUA_INTERIOR.some((pol) => dentro(lon, lat, pol));
}

/** Dirección (en el planeta sin rotar) de una latitud/longitud. */
export function puntoTierra(lat: number, lon: number) {
  const fi = THREE.MathUtils.degToRad(lat);
  const la = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(Math.cos(fi) * Math.sin(la), Math.sin(fi), Math.cos(fi) * Math.cos(la));
}

export function geometriaTierra(radio: number) {
  const g = new THREE.SphereGeometry(radio, 160, 112);
  const pos = g.attributes.position;
  const n = new THREE.Vector3();
  const colores: number[] = [];
  const c = {
    hondo: new THREE.Color("#245aa8"),
    mar: new THREE.Color("#2f72c4"),
    costa: new THREE.Color("#5aa2dc"),
    verde: new THREE.Color("#4f9a3c"),
    verdeOscuro: new THREE.Color("#3a7a2e"),
    arena: new THREE.Color("#d2a95c"),
    hielo: new THREE.Color("#eef3f4"),
  };
  const deg = THREE.MathUtils.radToDeg;
  for (let i = 0; i < pos.count; i++) {
    n.fromBufferAttribute(pos, i).normalize();
    const lat0 = deg(Math.asin(n.y));
    const lon0 = deg(Math.atan2(n.x, n.z));
    // costas irregulares: se mueve un poco el punto antes de preguntar si es tierra
    const dLon = (fbm(n, 3.1) - 0.5) * 6;
    const dLat = (fbm(n.clone().addScalar(9), 3.1) - 0.5) * 4;
    const lat = lat0 + dLat;
    const lon = lon0 + dLon;
    const tierra = esTierra(lon, lat);
    // cerca de la costa: ¿hay tierra a unos grados?
    const cerca = !tierra && [[3, 0], [-3, 0], [0, 3], [0, -3]].some(([a, b]) => esTierra(lon + a, lat + b));
    const bulto = fbm(n, 6);
    let alto: number;
    let color: THREE.Color;
    const hielo = Math.abs(lat0) > 78 || (lat0 < -66 && tierra);
    if (hielo) {
      alto = tierra ? 0.04 + bulto * 0.02 : 0.012;
      color = c.hielo.clone().offsetHSL(0, 0, (bulto - 0.5) * 0.06);
    } else if (tierra) {
      alto = 0.035 + bulto * 0.035; // la tierra es plastilina pegada encima del mar
      const desierto = DESIERTOS.some(([a, b, cc, d]) => lon >= a && lon <= cc && lat >= b && lat <= d);
      color = desierto ? c.arena.clone() : c.verde.clone().lerp(c.verdeOscuro, fbm(n, 4.5));
      color.offsetHSL(0, 0, (bulto - 0.5) * 0.08);
    } else {
      alto = (bulto - 0.5) * 0.008;
      color = (cerca ? c.costa : c.mar).clone().lerp(c.hondo, cerca ? 0 : fbm(n, 2.2) * 0.8);
    }
    pos.setXYZ(i, n.x * (radio + alto), n.y * (radio + alto), n.z * (radio + alto));
    colores.push(color.r, color.g, color.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(colores, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Colores de la Tierra después del choque, vértice por vértice (misma geometría): los
 * continentes quedan carbonizados con grietas de lava y los océanos hervidos en rojo oscuro.
 */
export function coloresArrasados(g: THREE.BufferGeometry, radio: number) {
  const pos = g.attributes.position;
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const salida = new Float32Array(pos.count * 3);
  const c = {
    carbon: new THREE.Color("#1c130e"),
    ceniza: new THREE.Color("#3f332d"),
    mar: new THREE.Color("#4a1a10"),
    marHondo: new THREE.Color("#24100b"),
    lava: new THREE.Color("#ff5a14"),
    lavaClara: new THREE.Color("#ffc23d"),
  };
  const color = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.copy(p).normalize();
    const tierra = p.length() - radio > 0.03;
    // grietas: donde el ruido cruza la mitad queda una línea fina y quebrada
    const grieta = Math.abs(fbm(n, 4.6) - 0.5);
    if (tierra) {
      color.copy(c.carbon).lerp(c.ceniza, fbm(n, 7.5));
      if (grieta < 0.03) color.copy(c.lava).lerp(c.lavaClara, 1 - grieta / 0.03);
    } else {
      color.copy(c.marHondo).lerp(c.mar, fbm(n, 3));
      if (grieta < 0.018) color.lerp(c.lava, 0.6 * (1 - grieta / 0.018));
    }
    salida[i * 3] = color.r;
    salida[i * 3 + 1] = color.g;
    salida[i * 3 + 2] = color.b;
  }
  return salida;
}
