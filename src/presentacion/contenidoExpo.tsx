/*
 * Contenido de la expo (/expo): 11 pasos, ~10 minutos. Una idea por paso, con tablitas.
 * Hilo: problema → dos fuentes → variables y escenarios → partición → qué hizo JPL →
 * validación cruzada → métricas y umbral → resultados (pasado y futuro) → conclusiones.
 * Toda cifra sale de resultados/ (src/data/resultados.ts). La portada es la misma del proyecto.
 */
import type { ReactNode } from "react";
import { graficasJpl, jpl, metricas, numero, principal, tablas } from "@/data/resultados";
import { fmt } from "@/lib/formato";
import { Cifra, COLOR, GraficaLineas, MatrizConfusion } from "@/graficas/Graficas";
import { TablaPlastilina } from "@/graficas/Tabla";
import { EVENTO_FINAL } from "./cinematica";
import { benchmark, Cifras, confB, ESC, ESCENARIOS, evalB, evalJ, Lead, Lista, Nota, Tarjeta, type Escenario } from "./piezas";

/** dos columnas desde tablet (el proyecto completo las pone desde escritorio) */
const Dos = ({ children }: { children: ReactNode }) => <div className="mt-4 grid items-start gap-5 md:grid-cols-2">{children}</div>;

const ESC_CORTO: Record<Escenario, string> = { A_completo: "A", B_sin_MOID: "B", C_sin_definicion: "C" };
const conMas = (v: number) => `+${v.toFixed(1)}`;
const [historico, recientes] = graficasJpl.periodos;
const incierta = (periodo: string) =>
  (graficasJpl.calidad_por_periodo as Record<string, Record<string, number>>)[periodo]["Incierta (U 7-9)"] / 100;

/* ------------------------------------------------------------------ 2 · el problema */

function Problema() {
  const prevalencia = metricas.dataset.prevalencia_peligrosos;
  return (
    <>
      <Lead>
        Un asteroide es <b>potencialmente peligroso</b> (PHA) si cumple dos condiciones a la vez. ¿Puede un modelo
        reconocerlos a partir de sus datos?
      </Lead>
      <Dos>
        <Tarjeta titulo="MOID ≤ 0.05 UA" color={COLOR.peligroso}>
          Su órbita pasa cerca de la de la Tierra: a menos de ~7.48 millones de km.
        </Tarjeta>
        <Tarjeta titulo="H ≤ 22.0" color={COLOR.peligroso}>
          Es grande: unos 140 m de diámetro o más.
        </Tarjeta>
      </Dos>
      <Cifras>
        <Cifra valor={fmt.porcentaje(prevalencia)} etiqueta="de los acercamientos son peligrosos" tono="peligro" />
        <Cifra valor={fmt.porcentaje(1 - prevalencia)} etiqueta="de exactitud diciendo siempre “no”" />
      </Cifras>
      <Nota>Con tan pocos peligrosos, la exactitud engaña: hay que medir sobre la clase peligrosa.</Nota>
    </>
  );
}

/* ------------------------------------------------------------------ 3 · dos fuentes, un método */

function Fuentes() {
  const c = graficasJpl.catalogo;
  return (
    <>
      <Lead>
        Trabajamos con dos fuentes y <b>el mismo método</b>: los mismos escenarios, las mismas métricas y el umbral calibrado.
      </Lead>
      <TablaPlastilina
        className="mt-4"
        columnas={[{ titulo: "" }, { titulo: "nasa.csv" }, { titulo: "Catálogo JPL" }]}
        filas={[
          { celdas: ["Origen", "Kaggle (foto antigua)", `API oficial SBDB (${c.fecha})`] },
          { celdas: ["Asteroides", fmt.entero(metricas.dataset.asteroides_unicos), fmt.entero(c.validos)] },
          // 751 repetidos: salida impresa de la celda 1.4 de pipeline_asteroides.ipynb
          { celdas: ["Filas", `${fmt.entero(metricas.dataset.filas)} acercamientos (751 se repiten)`, "una por asteroide"] },
          { celdas: ["Peligrosos", fmt.porcentaje(metricas.dataset.prevalencia_peligrosos), fmt.porcentaje(c.pha / c.validos)] },
          {
            celdas: ["Regla de la NASA vs etiqueta", fmt.porcentaje(metricas.dataset.acuerdo_regla_cneos, 2), fmt.porcentaje(c.acuerdo_regla, 2)],
          },
          { celdas: ["Fecha de descubrimiento", "no", "sí: permite probar con el futuro"], destacada: true },
        ]}
      />
      <Nota>La etiqueta coincide casi siempre con la regla: el reto es predecir sin darle al modelo la regla resuelta.</Nota>
    </>
  );
}

/* ------------------------------------------------------------------ 4 · variables y escenarios */

function Escenarios() {
  const n = principal.variables_por_escenario;
  return (
    <>
      <Lead>Si el modelo ve el MOID, solo copia la regla. Para saber si aprende algo más, entrenamos en tres escenarios:</Lead>
      <TablaPlastilina
        className="mt-4"
        columnas={[
          { titulo: "Escenario" },
          { titulo: "Qué se le quita", alinear: "izquierda" },
          { titulo: "Variables" },
          { titulo: "Para qué", alinear: "izquierda" },
        ]}
        filas={[
          { celdas: ["A · completo", "nada", String(n.A_completo), "Techo: puede copiar la regla"] },
          { celdas: ["B · sin MOID", "el MOID", String(n.B_sin_MOID), "El realista: el que se despliega"], destacada: true },
          { celdas: ["C · sin definición", "MOID y tamaño (H, diámetro)", String(n.C_sin_definicion), "Sin ninguna pista de la regla"] },
        ]}
      />
      <Lista
        items={[
          <>
            <b>Antes de todo</b>: de 40 columnas quitamos IDs, fechas, constantes (<i>Orbiting Body</i>, <i>Equinox</i>) y unidades
            repetidas.
          </>,
          <>
            <b>En JPL</b>: mismos escenarios. Diámetro y albedo no se usan porque faltan en el ~97% de los asteroides.
          </>,
        ]}
      />
    </>
  );
}

/* ------------------------------------------------------------------ 5 · partición */

function Particion() {
  const p = metricas.particion;
  const j = graficasJpl.particion;
  const fuga = principal.fuga as Record<string, string | number>[];
  const inflado = (e: Escenario) => Number(fuga.find((f) => f.Escenario === e)!["Inflado F1 (puntos)"]);
  const corte = graficasJpl.anio_corte;
  return (
    <>
      <Lead>
        Cada fuente pide su propia partición. En nasa.csv un asteroide aparece varias veces, así que se agrupa por asteroide; en
        JPL se parte <b>en el tiempo</b>, como en producción.
      </Lead>
      <TablaPlastilina
        className="mt-4"
        columnas={[{ titulo: "Conjunto" }, { titulo: "nasa.csv (agrupada)" }, { titulo: "JPL (temporal)" }, { titulo: "Para qué", alinear: "izquierda" }]}
        filas={[
          { celdas: ["Train", fmt.entero(p.train), `${fmt.entero(j.train)} · antes de ${corte}`, "entrenar y validación cruzada"] },
          { celdas: ["Validación", fmt.entero(p.validacion), `${fmt.entero(j.validacion)} · antes de ${corte}`, "solo calibrar el umbral"] },
          {
            celdas: ["Test", fmt.entero(p.test), `${fmt.entero(j.test)} · ${corte}–${graficasJpl.anio_actual}`, "una sola vez, al final"],
            destacada: true,
          },
        ]}
      />
      <Cifras>
        <Cifra valor={conMas(inflado("B_sin_MOID"))} etiqueta="puntos de F1 inflados en B si no se agrupa" tono="peligro" />
        <Cifra valor={conMas(inflado("C_sin_definicion"))} etiqueta="puntos inflados en C" tono="peligro" />
      </Cifras>
    </>
  );
}

/* ------------------------------------------------------------------ 6 · qué hizo JPL */

function Cielo() {
  const anios = graficasJpl.por_anio;
  const corte = graficasJpl.anio_corte;
  return (
    <>
      <Lead>
        JPL simula producción: entrena con lo descubierto hasta {corte - 1} y evalúa con lo que llegó después. Y el cielo cambió:
        los telescopios de hoy encuentran asteroides más pequeños.
      </Lead>
      <div className="mt-4 grid items-center gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <GraficaLineas
          titulo="H mediana de los descubiertos cada año (mayor = más pequeño)"
          series={[{ nombre: "H mediana", color: COLOR.A, puntos: anios.map((a) => [a.anio, a.H_mediana] as [number, number]) }]}
          x={[anios[0].anio, anios[anios.length - 1].anio]}
          y={[19, 26]}
          etiquetaX="año"
          etiquetaY="H"
          formatoX={(v) => v.toFixed(0)}
          formatoY={(v) => v.toFixed(1)}
          marcasX={[{ valor: corte - 0.5, etiqueta: `corte ${corte}` }]}
          marcasY={[{ valor: 22, etiqueta: "H = 22" }]}
          alto={220}
          ancho={440}
        />
        <TablaPlastilina
          compacta
          columnas={[{ titulo: "" }, { titulo: `Antes de ${corte}` }, { titulo: `${corte}–${graficasJpl.anio_actual}` }]}
          filas={[
            { celdas: ["H mediana", historico.H_mediana.toFixed(1), recientes.H_mediana.toFixed(1)] },
            { celdas: ["Peligrosos", fmt.porcentaje(historico.pct_pha), fmt.porcentaje(recientes.pct_pha)], destacada: true },
            {
              celdas: ["Órbita incierta", fmt.porcentaje(incierta(historico.periodo), 0), fmt.porcentaje(incierta(recientes.periodo), 0)],
            },
          ]}
        />
      </div>
      <Nota>
        Es un cambio real de distribución: el PSI de H es {fmt.decimal(jpl.psi.H, 2)} (desde 0.25 ya es drift). El modelo tiene que
        aguantarlo.
      </Nota>
    </>
  );
}

/* ------------------------------------------------------------------ 7 · validación cruzada */

function Validacion() {
  const filas = benchmark("B_sin_MOID");
  const elegidos = ["Bagging", "Gradient Boosting", "Random Forest", "Regresión Logística", "Baseline (Mayoritaria)"];
  const jplB = tablas.jplBenchmarkCv
    .filter((f) => f.Escenario === "B_sin_MOID")
    .sort((x, y) => numero(y, "pr_auc") - numero(x, "pr_auc"))[0];
  const pasos = ["Fold de entrenamiento", "Escalado", "Modelo", "Fold de prueba"];
  return (
    <>
      <Lead>
        12 modelos comparados con <b>validación cruzada de 5 folds</b>. Todo va dentro de un Pipeline: el escalado se ajusta solo con
        los folds de entrenamiento, así que no hay fuga.
      </Lead>
      {/* el Pipeline de cada vuelta, en una tira */}
      <ol className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-2 text-sm font-semibold" aria-label="Pipeline de cada vuelta">
        {pasos.map((p, i) => (
          <li key={p} className="flex items-center gap-1.5">
            <span className="piedrita px-3 py-1" style={{ background: i === 3 ? "oklch(0.86 0.09 40 / 0.6)" : "oklch(0.83 0.1 80 / 0.55)" }}>
              {p}
            </span>
            {i < pasos.length - 1 && <span aria-hidden>→</span>}
          </li>
        ))}
        <li className="text-[color:var(--tinta-suave)]">× 5 vueltas</li>
      </ol>
      <TablaPlastilina
        className="mt-3"
        titulo="Escenario B en nasa.csv (StratifiedGroupKFold, agrupado por asteroide)"
        compacta
        columnas={[{ titulo: "Modelo" }, { titulo: "PR-AUC" }, { titulo: "F2" }, { titulo: "Recall" }, { titulo: "Exactitud" }]}
        filas={elegidos.map((m) => {
          const f = filas.find((x) => x.Modelo === m)!;
          return {
            celdas: [
              m === "Baseline (Mayoritaria)" ? "Baseline (siempre “no”)" : m,
              `${fmt.decimal(numero(f, "pr_auc"))} ± ${fmt.decimal(numero(f, "pr_auc_std"))}`,
              fmt.decimal(numero(f, "f2")),
              fmt.decimal(numero(f, "recall")),
              fmt.decimal(numero(f, "accuracy")),
            ],
            destacada: m === evalB.modelo_nombre,
            atenuada: m.startsWith("Baseline"),
          };
        })}
      />
      <Nota>
        La exactitud engaña: el baseline saca casi lo mismo sin detectar ninguno. Diferencias menores al ± (~0.06) son ruido. En JPL
        (una fila por asteroide, StratifiedKFold) también ganó {jplB.Modelo} en B: PR-AUC {fmt.decimal(numero(jplB, "pr_auc"))} ±{" "}
        {fmt.decimal(numero(jplB, "pr_auc_std"))}.
      </Nota>
    </>
  );
}

/* ------------------------------------------------------------------ 8 · métricas y umbral */

function Metricas() {
  const j = evalJ.B_sin_MOID;
  return (
    <>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Tarjeta titulo="PR-AUC" color={COLOR.A}>
          Qué tan bien pone a los peligrosos por encima. Su azar es la prevalencia, no 0.5.
        </Tarjeta>
        <Tarjeta titulo="F2 = 5·P·R / (4·P + R)" color={COLOR.B}>
          Precisión y recall, con el doble de peso al recall.
        </Tarjeta>
        <Tarjeta titulo="Recall" color={COLOR.peligroso}>
          De los peligrosos, cuántos detecta. El peor error es que se escape uno.
        </Tarjeta>
      </div>
      <Lead>
        Un modelo dice “peligroso” si la probabilidad pasa de 0.5. Calibramos ese umbral en <b>Validación</b>, maximizando F2:
      </Lead>
      <TablaPlastilina
        className="mt-3"
        columnas={[{ titulo: "Modelo B en Test" }, { titulo: "Umbral calibrado" }, { titulo: "Detecta con 0.5" }, { titulo: "Detecta calibrado" }]}
        filas={[
          {
            celdas: [
              "nasa.csv",
              fmt.decimal(evalB.umbral),
              `${confB.umbral_05.vp} de ${confB.umbral_05.vp + confB.umbral_05.fn}`,
              `${confB.umbral_f2.vp} de ${confB.umbral_f2.vp + confB.umbral_f2.fn}`,
            ],
          },
          {
            celdas: [
              "JPL (recién descubiertos)",
              fmt.decimal(j.umbral),
              `${Math.round(j.test_umbral_05.recall * j.test.positivos)} de ${j.test.positivos}`,
              `${j.test.positivos - j.test.falsos_negativos} de ${j.test.positivos}`,
            ],
            destacada: true,
          },
        ]}
      />
      <Nota>A cambio aparecen más falsas alarmas, que solo cuestan una observación de seguimiento.</Nota>
    </>
  );
}

/* ------------------------------------------------------------------ 9 · resultados en nasa.csv */

function ResultadosNasa() {
  const t = evalB.test;
  const c = confB.umbral_f2;
  const filas = tablas.evaluacionTest;
  return (
    <>
      <Lead>
        El modelo desplegado ({evalB.modelo_nombre}, escenario B, umbral {evalB.umbral}) frente a los {c.fn + c.vp} peligrosos de Test,
        que nunca vio:
      </Lead>
      <Cifras>
        <Cifra valor={fmt.decimal(t.recall)} etiqueta="Recall" tono="acento" />
        <Cifra valor={fmt.decimal(t.precision)} etiqueta="Precisión" />
        <Cifra valor={fmt.decimal(t.f2)} etiqueta="F2" />
        <Cifra valor={fmt.decimal(t.pr_auc)} etiqueta="PR-AUC" />
      </Cifras>
      <Dos>
        <MatrizConfusion titulo="Matriz de confusión en Test" {...c} />
        <TablaPlastilina
          titulo="Los tres escenarios en Test"
          compacta
          columnas={[{ titulo: "Esc." }, { titulo: "Modelo", alinear: "izquierda" }, { titulo: "PR-AUC" }, { titulo: "Recall" }]}
          filas={ESCENARIOS.map((e) => {
            const f = filas.find((x) => x.Escenario === e)!;
            return {
              celdas: [ESC_CORTO[e], f.Modelo, fmt.decimal(numero(f, "Test PR-AUC")), fmt.decimal(numero(f, "Test Recall"))],
              destacada: e === "B_sin_MOID",
            };
          })}
        />
      </Dos>
      <Nota>Con MOID (A) roza la perfección porque copia la regla; sin tamaño (C) cae. {ESC.B_sin_MOID} es el punto realista.</Nota>
    </>
  );
}

/* ------------------------------------------------------------------ 10 · resultados en JPL */

function ResultadosJpl() {
  const t = evalJ.B_sin_MOID.test;
  const p = graficasJpl.particion;
  const detectados = t.positivos - t.falsos_negativos;
  const arco = (graficasJpl.por_arco_grandes as Record<string, string | number>[]).find((f) => String(f.Grupo).startsWith("<"))!;
  const c = evalJ.C_sin_definicion.test;
  return (
    <>
      <Lead>
        Entrenado solo con el pasado, el modelo B probado con los {fmt.entero(p.test)} asteroides descubiertos desde{" "}
        {graficasJpl.anio_corte}:
      </Lead>
      <Dos>
        <MatrizConfusion
          titulo={`Test ${graficasJpl.anio_corte}–${graficasJpl.anio_actual}`}
          vn={p.test - t.positivos - t.falsos_positivos}
          fp={t.falsos_positivos}
          fn={t.falsos_negativos}
          vp={detectados}
        />
        <div className="flex flex-col gap-4">
          <Cifra valor={`${detectados} de ${t.positivos}`} etiqueta="peligrosos nuevos detectados" tono="acento" />
          <Cifra
            valor={fmt.porcentaje(graficasJpl.alertas_b.tasa_test)}
            etiqueta={`de los nuevos marcados para revisar (${fmt.entero(detectados + t.falsos_positivos)})`}
          />
          <Cifra valor={`${String(arco["PHA detectados"])} de ${String(arco["PHA reales"])}`} etiqueta="con menos de 30 días observados" />
        </div>
      </Dos>
      <Nota>
        Sin tamaño (escenario C) colapsa: PR-AUC {fmt.decimal(c.pr_auc)} y {fmt.entero(c.falsos_positivos)} falsas alarmas. El tamaño es
        indispensable.
      </Nota>
    </>
  );
}

/* ------------------------------------------------------------------ 11 · conclusiones */

function Conclusiones() {
  const t = evalJ.B_sin_MOID.test;
  return (
    <div className="flex flex-col gap-1">
      <Lista
        items={[
          <>
            <b>La etiqueta es casi una regla.</b> Con el MOID el modelo solo la copia; si el MOID está disponible, la regla es más
            simple y explicable.
          </>,
          <>
            <b>Sin MOID sí aprende y generaliza.</b> Recall {fmt.decimal(evalB.test.recall)} en nasa.csv y {t.positivos - t.falsos_negativos}{" "}
            de {t.positivos} peligrosos del futuro en JPL, siempre que conozca el tamaño.
          </>,
          <>
            <b>Sirve como filtro de priorización:</b> revisar el {fmt.porcentaje(graficasJpl.alertas_b.tasa_test)} de los nuevos encuentra casi
            todos los peligrosos.
          </>,
        ]}
      />
      <p className="mt-4 font-display text-lg font-bold">Límites</p>
      <Lista
        items={[
          <>Test tiene pocos peligrosos ({confB.umbral_f2.fn + confB.umbral_f2.vp} y {t.positivos}): 1 o 2 detecciones mueven el recall.</>,
          <>Las órbitas recién descubiertas son provisionales: sus etiquetas pueden cambiar.</>,
        ]}
      />
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <p className="font-display text-[clamp(1.6rem,1.1rem+1.6vw,2.4rem)] font-extrabold leading-none">¿Preguntas?</p>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(EVENTO_FINAL))}
          className="boton-plastilina inline-flex min-h-12 items-center gap-2 bg-[color:var(--arcilla-roja)] px-6 font-display text-lg font-semibold text-crema"
        >
          ¿Y si no lo detectamos? Ver el final
        </button>
      </div>
    </div>
  );
}

export const CONTENIDO_EXPO: Record<string, () => ReactNode> = {
  "x-problema": Problema,
  "x-fuentes": Fuentes,
  "x-escenarios": Escenarios,
  "x-particion": Particion,
  "x-cielo": Cielo,
  "x-validacion": Validacion,
  "x-metricas": Metricas,
  "x-resultados-nasa": ResultadosNasa,
  "x-resultados-jpl": ResultadosJpl,
  "x-conclusiones": Conclusiones,
};
