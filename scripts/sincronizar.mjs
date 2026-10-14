/*
 * Trae a la presentación lo que producen los notebooks (están una carpeta arriba):
 *  - ../resultados  -> resultados/          (las cifras de las diapositivas)
 *  - ../*.ipynb     -> public/notebooks/    (los notebooks que se ven en el visor)
 * Los notebooks se copian con sus salidas; solo se quitan las marcas de tiempo de ejecución,
 * que cambian en cada corrida y no se muestran.
 * Uso: npm run sincronizar (después de volver a correr los notebooks).
 */
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const NOTEBOOKS = ["pipeline_asteroides.ipynb", "catalogo_jpl_asteroides.ipynb"];

cpSync("../resultados", "resultados", { recursive: true });
console.log("resultados/ actualizada");

mkdirSync("public/notebooks", { recursive: true });
for (const archivo of NOTEBOOKS) {
  const nb = JSON.parse(readFileSync(`../${archivo}`, "utf8"));
  for (const celda of nb.cells) delete celda.metadata?.execution;
  writeFileSync(`public/notebooks/${archivo}`, JSON.stringify(nb));
  console.log(`public/notebooks/${archivo}`);
}
