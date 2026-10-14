/*
 * Los dos notebooks del proyecto y en qué sección abre el visor según el paso de la presentación.
 * Las anclas son los <a id="..."> de los markdowns de cada notebook (s… principal, j… JPL).
 */
export type CualNotebook = "principal" | "jpl";

export const NOTEBOOKS: Record<CualNotebook, { archivo: string; titulo: string }> = {
  principal: { archivo: "pipeline_asteroides.ipynb", titulo: "Notebook principal" },
  jpl: { archivo: "catalogo_jpl_asteroides.ipynb", titulo: "Catálogo JPL" },
};

export type Destino = { cual: CualNotebook; ancla?: string; etiqueta?: string };

const p = (ancla?: string, etiqueta?: string): Destino => ({ cual: "principal", ancla, etiqueta });
const j = (ancla?: string, etiqueta?: string): Destino => ({ cual: "jpl", ancla, etiqueta });

/** id de la diapositiva -> sección del notebook que la respalda */
const POR_PASO: Record<string, Destino> = {
  // proyecto completo
  problema: p("s1-1", "1.1"),
  metodo: p(),
  desbalance: p("s1-5", "1.5"),
  regla: p("s1-4", "1.4"),
  escenarios: p("s1-2", "1.2"),
  fuga: p("s2-3", "2.3"),
  particion: p("s2-2", "2.2"),
  limpieza: p("s2-1", "2.1"),
  phik: p("s3-1", "3.1"),
  escalado: p("s3-2", "3.2"),
  pca: p("s3-3", "3.3"),
  seleccion: p("s3-4", "3.4"),
  shap: p("s3-5", "3.5"),
  knn: p("s4-1", "4.1"),
  benchmark: p("s4-3", "4.3"),
  ajuste: p("s5-1", "5.1"),
  umbral: p("s5-2", "5.2"),
  "resultado-b": p("s5-2", "5.2"),
  "abc-test": p("s5-3", "5.3"),
  despliegue: p("s6-1", "6.1"),
  monitoreo: p("s7-1", "7.1"),
  catalogo: j("j1", "JPL 1"),
  cielo: j("j2", "JPL 2"),
  futuro: j("j5", "JPL 5"),
  inciertas: j("j6", "JPL 6"),
  "sin-tamano": j("j5", "JPL 5"),
  decisiones: p("s8-3", "8.3"),
  lecciones: p("s8-3", "8.3"),
  // expo
  "x-problema": p("s1-1", "1.1"),
  "x-fuentes": j(undefined, "JPL"),
  "x-escenarios": p("s1-2", "1.2"),
  "x-particion": p("s2-2", "2.2"),
  "x-cielo": j("j2", "JPL 2"),
  "x-validacion": p("s4-3", "4.3"),
  "x-metricas": p("s5-1", "5.1"),
  "x-resultados-nasa": p("s5-2", "5.2"),
  "x-resultados-jpl": j("j5", "JPL 5"),
  "x-conclusiones": p("s8-3", "8.3"),
};

export const destinoDePaso = (id: string | undefined): Destino => (id && POR_PASO[id]) || p();
