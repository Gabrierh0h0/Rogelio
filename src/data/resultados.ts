/*
 * Única puerta de entrada a las cifras del proyecto. Todo sale de resultados/ (copia de lo que exporta el notebook),
 * que exportan los notebooks; aquí no se escribe ningún número a mano.
 */
import metricasJson from "@resultados/metrics_summary.json";
import jplJson from "@resultados/jpl_metrics_summary.json";
// datos de las gráficas (celdas "presentación" al final de cada notebook)
import principalJson from "@resultados/presentacion_principal.json";
import graficasJplJson from "@resultados/presentacion_jpl.json";
import benchmarkCvCsv from "@resultados/benchmark_cv.csv?raw";
import escaladoCvCsv from "@resultados/escalado_cv.csv?raw";
import seleccionRasgosCsv from "@resultados/seleccion_rasgos_cv.csv?raw";
import evaluacionTestCsv from "@resultados/evaluacion_test_por_escenario.csv?raw";
import jplBenchmarkCsv from "@resultados/jpl_benchmark_cv.csv?raw";
import jplEvaluacionCsv from "@resultados/jpl_evaluacion_test.csv?raw";
import jplCalidadCsv from "@resultados/jpl_test_por_calidad_orbita.csv?raw";

export type Fila = Record<string, string>;

/** CSV simple con comillas dobles (formato de pandas.to_csv). */
export function leerCsv(texto: string): Fila[] {
  const filas: string[][] = [];
  let campo = "";
  let fila: string[] = [];
  let entreComillas = false;
  const limpio = texto.replace(/^﻿/, "");
  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if (entreComillas) {
      if (c === '"' && limpio[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') {
        entreComillas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      entreComillas = true;
    } else if (c === ",") {
      fila.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && limpio[i + 1] === "\n") i++;
      fila.push(campo);
      if (fila.some((v) => v !== "")) filas.push(fila);
      fila = [];
      campo = "";
    } else {
      campo += c;
    }
  }
  if (campo !== "" || fila.length) {
    fila.push(campo);
    filas.push(fila);
  }
  const [encabezado, ...resto] = filas;
  return resto.map((valores) =>
    Object.fromEntries(encabezado.map((col, j) => [col, valores[j] ?? ""])),
  );
}

/** Lee una columna numérica; falla en voz alta si no existe (nunca inventar un 0). */
export function numero(fila: Fila, columna: string): number {
  const crudo = fila[columna];
  if (crudo === undefined) throw new Error(`Columna inexistente en resultados: "${columna}"`);
  const valor = Number(crudo);
  if (Number.isNaN(valor)) throw new Error(`Valor no numérico en "${columna}": "${crudo}"`);
  return valor;
}

export const metricas = metricasJson;
export const jpl = jplJson;
export const principal = principalJson;
export const graficasJpl = graficasJplJson;

export const tablas = {
  benchmarkCv: leerCsv(benchmarkCvCsv),
  escaladoCv: leerCsv(escaladoCvCsv),
  seleccionRasgosCv: leerCsv(seleccionRasgosCsv),
  evaluacionTest: leerCsv(evaluacionTestCsv),
  jplBenchmarkCv: leerCsv(jplBenchmarkCsv),
  jplEvaluacionTest: leerCsv(jplEvaluacionCsv),
  jplCalidadOrbita: leerCsv(jplCalidadCsv),
} as const;
