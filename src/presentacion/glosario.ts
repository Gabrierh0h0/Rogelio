/*
 * Geodas del piso: un término por geoda. Las definiciones vienen del notebook
 * pipeline_asteroides.ipynb (secciones 1.1, 1.3, 5.1 y 5.3), sin cifras nuevas.
 */
export type Entrada = { id: string; termino: string; texto: string; formula?: string };

export const GLOSARIO: Entrada[] = [
  {
    id: "moid",
    termino: "MOID",
    texto:
      "Minimum Orbit Intersection Distance: la distancia mínima entre la órbita de la Tierra y la del asteroide. El límite de la NASA es 0.05 UA, unos 7.48 millones de km (~19.5 distancias lunares).",
  },
  {
    id: "h",
    termino: "Magnitud absoluta (H)",
    texto:
      "El brillo propio del asteroide en una escala astronómica invertida: mientras menor es H, más grande es. H ≤ 22.0 corresponde aproximadamente a un diámetro de 140 m o más, capaz de causar destrucción regional severa.",
  },
  {
    id: "pr-auc",
    termino: "PR-AUC",
    texto:
      "Área bajo la curva Precision-Recall (Average Precision). Mide qué tan bien el modelo pone a los peligrosos por encima de los demás, sin depender del umbral. Su línea base es la prevalencia de la clase peligrosa (no 0.5), por eso informa más que la ROC cuando las clases están desbalanceadas.",
  },
  {
    id: "f2",
    termino: "F2",
    texto:
      "Combina precisión (P) y recall (R) dándole al recall el doble de peso. Se usa porque el error más costoso es un falso negativo: no advertir un asteroide peligroso.",
    formula: "F2 = 5·P·R / (4·P + R)",
  },
];
