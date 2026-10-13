/*
 * Guiones de la presentación: una entrada por asteroide. Hay dos, con la misma app:
 * - /proyecto: el proyecto completo (30 pasos, portafolio).
 * - /expo: la exposición de clase (~10 min, 11 pasos).
 * En / no hay guion: se muestra la portada con los dos botones (ui/Portal.tsx).
 * El contenido de cada diapositiva sale de resultados/ (src/data/resultados.ts); aquí solo
 * van el capítulo, el título, cómo reacciona el dino y con qué cinemática llega.
 */
export type Reaccion =
  | "saluda"
  | "curioso"
  | "duda"
  | "piensa"
  | "susto"
  | "alivio"
  | "asombro"
  | "celebra"
  | "decepcion"
  | "tapaOjos"
  /** solo en la cinemática final: el golpe del impacto */
  | "sacudido"
  /** solo en la cinemática final: flotando a la deriva después del choque */
  | "mareado";

export type Capitulo = {
  id: string;
  nombre: string;
};

const CAPITULOS_PROYECTO: Capitulo[] = [
  { id: "intro", nombre: "Intro" },
  { id: "analyze", nombre: "Analyze" },
  { id: "design", nombre: "Design" },
  { id: "datos", nombre: "Datos" },
  { id: "modelos", nombre: "Modelos" },
  { id: "deploy", nombre: "Deploy y Operate" },
  { id: "jpl", nombre: "Recién descubiertos" },
  { id: "cierre", nombre: "Cierre" },
];

export type Diapositiva = {
  id: string;
  capitulo: Capitulo["id"];
  titulo: string;
  reaccion: Reaccion;
  /** cómo llega el asteroide y cómo sale el papel (escena/coreografias.ts); por defecto, se abre como geoda */
  cinematica?: Cinematica;
};

/** Coreografías de llegada de cada asteroide (la expo usa una distinta en cada paso). */
export type Cinematica =
  | "geoda"
  | "marioneta"
  | "huevo"
  | "partido"
  | "tajadas"
  | "cuchillo"
  | "telescopio"
  | "folds"
  | "perilla"
  | "red"
  | "calendario"
  | "atrapa";

const PROYECTO: Diapositiva[] = [
  { id: "portada", capitulo: "intro", titulo: "¿Nos va a caer un asteroide?", reaccion: "saluda" },
  { id: "problema", capitulo: "intro", titulo: "El problema", reaccion: "curioso" },
  { id: "metodo", capitulo: "intro", titulo: "El método: ASUM-DM", reaccion: "piensa" },

  { id: "desbalance", capitulo: "analyze", titulo: "Muy pocos son peligrosos", reaccion: "duda" },
  { id: "regla", capitulo: "analyze", titulo: "La etiqueta es una regla", reaccion: "duda" },
  { id: "escenarios", capitulo: "analyze", titulo: "Tres escenarios", reaccion: "piensa" },

  { id: "fuga", capitulo: "design", titulo: "La trampa: fuga por agrupamiento", reaccion: "susto" },
  { id: "particion", capitulo: "design", titulo: "Partición sin trampa", reaccion: "alivio" },

  { id: "limpieza", capitulo: "datos", titulo: "Limpieza", reaccion: "curioso" },
  { id: "phik", capitulo: "datos", titulo: "Correlación φK", reaccion: "piensa" },
  { id: "escalado", capitulo: "datos", titulo: "Escalado", reaccion: "curioso" },
  { id: "pca", capitulo: "datos", titulo: "PCA", reaccion: "decepcion" },
  { id: "seleccion", capitulo: "datos", titulo: "Selección de rasgos", reaccion: "piensa" },
  { id: "shap", capitulo: "datos", titulo: "SHAP: qué mira el modelo", reaccion: "asombro" },

  { id: "knn", capitulo: "modelos", titulo: "k-NN: sesgo vs varianza", reaccion: "piensa" },
  { id: "benchmark", capitulo: "modelos", titulo: "12 modelos × 3 escenarios", reaccion: "curioso" },
  { id: "ajuste", capitulo: "modelos", titulo: "Ajuste fino", reaccion: "piensa" },
  { id: "umbral", capitulo: "modelos", titulo: "Mover el umbral", reaccion: "alivio" },
  { id: "resultado-b", capitulo: "modelos", titulo: "Resultado del modelo B", reaccion: "celebra" },
  { id: "abc-test", capitulo: "modelos", titulo: "A vs B vs C en Test", reaccion: "curioso" },

  { id: "despliegue", capitulo: "deploy", titulo: "Despliegue", reaccion: "celebra" },
  { id: "monitoreo", capitulo: "deploy", titulo: "Monitoreo", reaccion: "piensa" },

  { id: "catalogo", capitulo: "jpl", titulo: "El catálogo completo", reaccion: "curioso" },
  { id: "cielo", capitulo: "jpl", titulo: "El cielo cambia", reaccion: "asombro" },
  { id: "futuro", capitulo: "jpl", titulo: "Prueba con el futuro", reaccion: "celebra" },
  { id: "inciertas", capitulo: "jpl", titulo: "Órbitas inciertas", reaccion: "alivio" },
  { id: "sin-tamano", capitulo: "jpl", titulo: "Sin tamaño, nada", reaccion: "tapaOjos" },

  { id: "decisiones", capitulo: "cierre", titulo: "Decisiones clave", reaccion: "piensa" },
  { id: "lecciones", capitulo: "cierre", titulo: "Lecciones y límites", reaccion: "piensa" },
  { id: "preguntas", capitulo: "cierre", titulo: "¿Preguntas?", reaccion: "saluda" },
];

const CAPITULOS_EXPO: Capitulo[] = [
  { id: "inicio", nombre: "Inicio" },
  { id: "datos", nombre: "Datos" },
  { id: "jpl", nombre: "JPL" },
  { id: "validacion", nombre: "Validación" },
  { id: "resultados", nombre: "Resultados" },
  { id: "cierre", nombre: "Cierre" },
];

const EXPO: Diapositiva[] = [
  { id: "portada", capitulo: "inicio", titulo: "¿Nos va a caer un asteroide?", reaccion: "saluda", cinematica: "marioneta" },
  { id: "x-problema", capitulo: "inicio", titulo: "El problema", reaccion: "susto", cinematica: "huevo" },
  { id: "x-fuentes", capitulo: "datos", titulo: "Dos fuentes, un método", reaccion: "curioso", cinematica: "partido" },
  { id: "x-escenarios", capitulo: "datos", titulo: "Las variables y los 3 escenarios", reaccion: "piensa", cinematica: "tajadas" },
  { id: "x-particion", capitulo: "datos", titulo: "Cómo partimos los datos", reaccion: "duda", cinematica: "cuchillo" },
  { id: "x-cielo", capitulo: "jpl", titulo: "Qué hizo JPL: el cielo cambia", reaccion: "asombro", cinematica: "telescopio" },
  { id: "x-validacion", capitulo: "validacion", titulo: "Validación cruzada", reaccion: "piensa", cinematica: "folds" },
  { id: "x-metricas", capitulo: "validacion", titulo: "Métricas y umbral", reaccion: "curioso", cinematica: "perilla" },
  { id: "x-resultados-nasa", capitulo: "resultados", titulo: "Resultados: el pasado", reaccion: "alivio", cinematica: "red" },
  { id: "x-resultados-jpl", capitulo: "resultados", titulo: "Resultados: el futuro", reaccion: "celebra", cinematica: "calendario" },
  { id: "x-conclusiones", capitulo: "cierre", titulo: "Conclusiones", reaccion: "celebra", cinematica: "atrapa" },
];

/** Qué se ve según la ruta: la expo, el proyecto completo o la portada con los dos botones. */
export type Modo = "expo" | "proyecto" | "portal";

function modoDesdeRuta(): Modo {
  const ruta = window.location.pathname.replace(/\/+$/, "").toLowerCase();
  if (ruta.endsWith("/expo")) return "expo";
  if (ruta.endsWith("/proyecto")) return "proyecto";
  return "portal";
}

export const MODO = modoDesdeRuta();
export const DIAPOSITIVAS: Diapositiva[] = MODO === "expo" ? EXPO : PROYECTO;
export const CAPITULOS: Capitulo[] = MODO === "expo" ? CAPITULOS_EXPO : CAPITULOS_PROYECTO;
export const TOTAL = DIAPOSITIVAS.length;

export function capituloDe(indice: number) {
  const d = DIAPOSITIVAS[indice];
  return CAPITULOS.find((c) => c.id === d.capitulo)!;
}
