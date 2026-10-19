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
  problema: p("s1", "1"),
  metodo: p(),
  desbalance: p("s5-4", "5.4"),
  regla: p("s5-3", "5.3"),
  escenarios: p("s2", "2"),
  fuga: p("s6-3", "6.3"),
  particion: p("s6-2", "6.2"),
  limpieza: p("s6-1", "6.1"),
  phik: p("s5-6", "5.6"),
  escalado: p("s6-4", "6.4"),
  pca: p("s8-2", "8.2"),
  seleccion: p("s8-1", "8.1"),
  shap: p("s8-2", "8.2"),
  knn: p("s7-2", "7.2"),
  benchmark: p("s7-13", "7.13"),
  ajuste: p("s8-4", "8.4"),
  umbral: p("s8-4", "8.4"),
  "resultado-b": p("s8-6", "8.6"),
  "abc-test": p("s8-8", "8.8"),
  despliegue: p("s9-1", "9.1"),
  monitoreo: p("s10-1", "10.1"),
  catalogo: j("j1", "JPL 1"),
  cielo: j("j2", "JPL 2"),
  futuro: j("j5-3", "JPL 5.3"),
  inciertas: j("j6", "JPL 6"),
  "sin-tamano": j("j5-3", "JPL 5.3"),
  decisiones: p("s11-2", "11.2"),
  lecciones: p("s11-2", "11.2"),
  // expo
  "x-problema": p("s1", "1"),
  "x-fuentes": j(undefined, "JPL"),
  "x-escenarios": p("s2", "2"),
  "x-particion": p("s6-2", "6.2"),
  "x-cielo": j("j2", "JPL 2"),
  "x-validacion": p("s7-13", "7.13"),
  "x-metricas": p("s8-4", "8.4"),
  "x-resultados-nasa": p("s8-6", "8.6"),
  "x-resultados-jpl": j("j5-3", "JPL 5.3"),
  "x-conclusiones": p("s11-2", "11.2"),
};

export const destinoDePaso = (id: string | undefined): Destino => (id && POR_PASO[id]) || p();
