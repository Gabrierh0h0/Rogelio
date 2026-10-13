/*
 * Guion de la presentación: una entrada por asteroide. El contenido de cada diapositiva
 * se completa en la fase (d) leyendo resultados/ (src/data/resultados.ts); aquí solo
 * van el capítulo, el título y cómo reacciona el dino.
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

export const CAPITULOS: Capitulo[] = [
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
};

export const DIAPOSITIVAS: Diapositiva[] = [
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

export const TOTAL = DIAPOSITIVAS.length;

export function capituloDe(indice: number) {
  const d = DIAPOSITIVAS[indice];
  return CAPITULOS.find((c) => c.id === d.capitulo)!;
}
