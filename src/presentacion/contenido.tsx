/*
 * Contenido de cada diapositiva. Toda cifra sale de resultados/ (src/data/resultados.ts);
 * los textos resumen las secciones y conclusiones de los notebooks, sin números nuevos.
 * Las dos únicas excepciones citan salidas impresas del notebook y lo dicen en el comentario.
 */
import type { ReactNode } from "react";
import { graficasJpl, jpl, metricas, numero, principal, tablas } from "@/data/resultados";
import { fmt } from "@/lib/formato";
import { EVENTO_FINAL } from "./cinematica";
import { CONTENIDO_EXPO } from "./contenidoExpo";
import {
  Lead,
  Nota,
  Cifras,
  Dos,
  Bloque,
  Lista,
  Tarjeta,
  Equipo,
  nombre,
  ESC,
  type Escenario,
  ESCENARIOS,
  SERIES_ESC,
  evalB,
  evalJ,
  confB,
  pctTotal,
  benchmark,
  pr,
} from "./piezas";
import {
  BarrasAgrupadas,
  BarrasH,
  Cifra,
  COLOR,
  GraficaLineas,
  MatrizConfusion,
  PuntosEscenarios,
} from "@/graficas/Graficas";

/* ------------------------------------------------------------------ diapositivas */

function Portada() {
  return (
    <div className="flex flex-col gap-5 py-2">
      <h2 id="titulo-diapositiva" className="font-display text-[length:var(--texto-titulo)] font-extrabold leading-[0.95]">
        ¿Nos va a caer un asteroide?
      </h2>
      <p className="max-w-[40ch] text-lg leading-relaxed text-[color:var(--tinta-suave)]">
        Un modelo de machine learning que detecta asteroides potencialmente peligrosos, contado paso a paso con la
        metodología ASUM-DM.
      </p>
      <Equipo />
      <p className="text-sm text-[color:var(--tinta-suave)]">
        Avanza con las flechas, los botones o tocando un asteroide. Las geodas del piso explican los términos.
      </p>
    </div>
  );
}

function Problema() {
  return (
    <>
      <Lead>
        La NASA llama <b>potencialmente peligroso</b> (PHA) a un asteroide que cumple <b>dos condiciones a la vez</b>:
      </Lead>
      <Dos>
        <Tarjeta titulo="MOID ≤ 0.05 UA" color={COLOR.peligroso}>
          Su órbita pasa a menos de ~7.48 millones de km de la órbita de la Tierra (unas 19.5 distancias lunares).
        </Tarjeta>
        <Tarjeta titulo="H ≤ 22.0" color={COLOR.peligroso}>
          Es grande: aproximadamente 140 m de diámetro o más, capaz de causar destrucción regional severa.
        </Tarjeta>
      </Dos>
      <Cifras>
        <Cifra valor={fmt.entero(metricas.dataset.filas)} etiqueta="acercamientos en nasa.csv" />
        {/* 40 columnas: assert data.shape == (4687, 40) en la celda 1.4 del notebook */}
        <Cifra valor="40" etiqueta="columnas por acercamiento" />
        <Cifra valor={fmt.entero(metricas.dataset.asteroides_unicos)} etiqueta="asteroides únicos" />
      </Cifras>
      <Nota>La pregunta del proyecto: ¿puede un modelo aprender a reconocer los peligrosos a partir de sus datos?</Nota>
    </>
  );
}

function Metodo() {
  const fases: [string, string][] = [
    ["Analyze", "Entender la regla de la NASA, el desbalance y plantear 3 escenarios."],
    ["Design", "Partición sin trampa: agrupada por asteroide y con Validación y Test separados."],
    ["Configure & Build", "Limpieza, escalado, PCA, selección de rasgos, 13 modelos ajustados, umbral y pruebas de sobreajuste."],
    ["Deploy", "Modelo guardado con joblib y una función de predicción que valida la entrada."],
    ["Operate & Optimize", "Monitoreo del drift con PSI y plan de reentrenamiento."],
  ];
  return (
    <>
      <Lead>Usamos ASUM-DM (IBM): cinco fases iterativas más la gestión del proyecto.</Lead>
      <ol className="mt-4 grid gap-x-6 gap-y-3 lg:grid-cols-2">
        {fases.map(([f, d], i) => (
          <li key={f} className="flex items-start gap-4">
            <span className="piedrita grid size-9 shrink-0 place-items-center bg-[color:var(--calendula)] font-display text-lg font-extrabold">
              {i + 1}
            </span>
            <span className="leading-snug">
              <b className="font-display text-lg">{f}</b>
              <br />
              <span className="text-sm text-[color:var(--tinta-suave)]">{d}</span>
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

function Desbalance() {
  const base = numero(benchmark("B_sin_MOID").find((f) => f.Modelo === "Baseline (Mayoritaria)")!, "pr_auc");
  return (
    <>
      <Lead>Solo 1 de cada 6 acercamientos es peligroso. Un modelo perezoso que siempre diga “no” parece bueno.</Lead>
      <Bloque>
        <BarrasH
          titulo="Acercamientos por clase"
          formato={fmt.entero}
          anchoEtiqueta={150}
          filas={[
            { etiqueta: "No peligrosos", valor: principal.clases.no_peligroso, color: COLOR.noPeligroso },
            { etiqueta: "Peligrosos", valor: principal.clases.peligroso, color: COLOR.peligroso },
          ]}
        />
      </Bloque>
      <Cifras>
        <Cifra valor={fmt.porcentaje(metricas.dataset.prevalencia_peligrosos)} etiqueta="son peligrosos" tono="peligro" />
        <Cifra valor={fmt.porcentaje(1 - metricas.dataset.prevalencia_peligrosos)} etiqueta="accuracy del modelo que siempre dice “no”" />
        <Cifra valor={fmt.decimal(base)} etiqueta="PR-AUC de ese mismo modelo" />
      </Cifras>
      <Nota>Por eso no usamos accuracy: medimos PR-AUC, F2 y recall, que se fijan en la clase peligrosa.</Nota>
    </>
  );
}

function Regla() {
  const r = principal.regla_vs_etiqueta;
  return (
    <>
      <Lead>
        Comparamos la regla de la NASA con la etiqueta <i>Hazardous</i> del dataset: coinciden casi siempre. Si el modelo ve
        el MOID, le basta con copiar la regla.
      </Lead>
      <Dos>
        <MatrizConfusion
          titulo="Regla de la NASA vs etiqueta"
          vn={r.regla_0_etiqueta_0}
          fp={r.regla_1_etiqueta_0}
          fn={r.regla_0_etiqueta_1}
          vp={r.regla_1_etiqueta_1}
          columnas={["Regla: no", "Regla: sí"]}
          filas={["Etiqueta: no", "Etiqueta: sí"]}
          etiquetas={["coinciden", "no coinciden", "no coinciden", "coinciden"]}
        />
        <div className="flex flex-col justify-center gap-4">
          <Cifra valor={fmt.porcentaje(metricas.dataset.acuerdo_regla_cneos, 2)} etiqueta="de acuerdo entre regla y etiqueta" tono="acento" />
          <Nota>
            Con el MOID, cualquier ensamble redescubre la regla. Lo interesante es ver qué pasa cuando se lo quitamos.
          </Nota>
        </div>
      </Dos>
    </>
  );
}

function Escenarios() {
  const n = principal.variables_por_escenario;
  return (
    <>
      <Lead>Para saber si el modelo aprende algo más que la regla, entrenamos en tres escenarios:</Lead>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Tarjeta titulo={`A · completo (${n.A_completo} variables)`} color={COLOR.A}>
          Todas las variables limpias, incluido el MOID. Sirve de techo.
        </Tarjeta>
        <Tarjeta titulo={`B · sin MOID (${n.B_sin_MOID})`} color={COLOR.B}>
          Sin la distancia mínima de órbitas. Es el escenario realista y el que se despliega.
        </Tarjeta>
        <Tarjeta titulo={`C · sin definición (${n.C_sin_definicion})`} color={COLOR.C}>
          Sin MOID, sin H y sin diámetro: sin ninguna pista de la regla.
        </Tarjeta>
      </div>
    </>
  );
}

function Fuga() {
  const filas = principal.fuga as Record<string, string | number>[];
  const de = (esc: Escenario) => filas.find((f) => f.Escenario === esc)!;
  return (
    <>
      <Lead>
        Cada fila es un <b>acercamiento</b>, no un asteroide: hay asteroides que aparecen varias veces. Si se reparten al
        azar, el modelo “reconoce” al asteroide en lugar de aprender.
      </Lead>
      <Bloque>
        <BarrasAgrupadas
          titulo="F1 en validación cruzada: ingenua vs agrupada por asteroide"
          series={[
            { nombre: "Ingenua (filas al azar)", color: COLOR.C },
            { nombre: "Agrupada por asteroide", color: COLOR.A },
          ]}
          grupos={ESCENARIOS.map((e) => ({
            etiqueta: ESC[e],
            valores: [Number(de(e)["Ingenua (StratifiedKFold)"]), Number(de(e)["Agrupada (StratifiedGroupKFold)"])],
          }))}
          notas={ESCENARIOS.map((e) => `+${Number(de(e)["Inflado F1 (puntos)"]).toFixed(1)} puntos inflados`)}
          max={1.1}
          alto={160}
        />
      </Bloque>
      {/* 751 asteroides repetidos: salida impresa de la celda 1.4 del notebook */}
      <Nota>
        {fmt.entero(metricas.dataset.filas)} filas pero solo {fmt.entero(metricas.dataset.asteroides_unicos)} asteroides
        (751 aparecen más de una vez). Sin agrupar, el escenario C parecería ~22 puntos mejor de lo que es.
      </Nota>
    </>
  );
}

function Particion() {
  const p = metricas.particion;
  return (
    <>
      <Lead>Partimos por asteroide (StratifiedGroupKFold): ningún asteroide queda en dos conjuntos a la vez.</Lead>
      <Bloque>
        <BarrasH
          titulo="Acercamientos por conjunto"
          formato={(v) => `${fmt.entero(v)} (${pctTotal(v)})`}
          anchoEtiqueta={130}
          color={COLOR.A}
          filas={[
            { etiqueta: "Train", valor: p.train },
            { etiqueta: "Validación", valor: p.validacion },
            { etiqueta: "Test", valor: p.test },
          ]}
        />
      </Bloque>
      <Lista
        items={[
          <>
            <b>Train</b>: ajusta y compara modelos con validación cruzada agrupada de 5 pliegues, repetida con 3 semillas.
          </>,
          <>
            <b>Validación</b>: solo para elegir el umbral de decisión.
          </>,
          <>
            <b>Test</b>: se usa una sola vez, al final.
          </>,
        ]}
      />
    </>
  );
}

function Limpieza() {
  return (
    <>
      <Cifras>
        <Cifra valor="40" etiqueta="columnas crudas" />
        <Cifra valor={String(principal.variables_por_escenario.A_completo)} etiqueta="variables útiles" tono="acento" />
      </Cifras>
      <Lista
        items={[
          <>
            <b>Identificadores y fechas</b>: ID, nombre, órbita, fechas de acercamiento y de cálculo.
          </>,
          <>
            <b>Constantes</b>: <i>Orbiting Body</i> siempre es la Tierra y <i>Equinox</i> siempre J2000.
          </>,
          <>
            <b>Unidades repetidas</b>: el diámetro, la velocidad y la distancia venían en varias unidades; dejamos una.
          </>,
          <>Todo lo demás (escalado, selección, PCA) va dentro de Pipelines, ajustado solo con Train.</>,
        ]}
      />
    </>
  );
}

function Phik() {
  const top = Object.entries(principal.phik_hazardous).slice(0, 7);
  return (
    <>
      <Lead>φK mide asociación incluso cuando la relación no es lineal. Las dos variables de la regla encabezan la lista.</Lead>
      <Bloque>
        <BarrasH
          titulo="Asociación φK con la etiqueta de peligro (Train)"
          max={1}
          filas={top.map(([c, v], i) => ({
            etiqueta: nombre(c),
            valor: v as number,
            color: i < 2 ? COLOR.peligroso : COLOR.B,
            destacada: i < 2,
          }))}
        />
      </Bloque>
    </>
  );
}

function Escalado() {
  const filas = tablas.escaladoCv;
  const escaladores = ["Sin escalar", "StandardScaler", "MinMaxScaler", "RobustScaler"];
  const colores = [COLOR.tintaSuave, COLOR.B, COLOR.A, COLOR.C];
  const modelos = ["Logistic Regression", "SVM (RBF)", "k-NN (k=15)"];
  return (
    <>
      <Lead>
        Los modelos que miden distancias necesitan variables en la misma escala. Comparamos 4 opciones en el escenario B.
      </Lead>
      <Bloque>
        <BarrasAgrupadas
          titulo="PR-AUC en validación cruzada (escenario B)"
          series={escaladores.map((e, i) => ({ nombre: e, color: colores[i] }))}
          grupos={modelos.map((mo) => ({
            etiqueta: mo.replace("Logistic Regression", "Regresión logística"),
            valores: escaladores.map((e) => numero(filas.find((f) => f.Escalador === e && f.Modelo === mo)!, "pr_auc")),
          }))}
          max={0.6}
        />
      </Bloque>
      <Nota>
        Elegido: <b>{metricas.escalador_elegido}</b>. Sin escalar, la SVM y el k-NN apenas superan al azar.
      </Nota>
    </>
  );
}

function Pca() {
  const acum = principal.pca.varianza_acumulada;
  const ev = principal.pca.evaluacion as Record<string, string | number>[];
  const rf = (rep: string) => Number(ev.find((f) => String(f["Representación"]).startsWith(rep) && f.Modelo === "RandomForest")!.pr_auc);
  return (
    <>
      <Lead>PCA resume las variables en menos componentes. Pero comprimir no siempre ayuda a separar las clases.</Lead>
      <Dos>
        <GraficaLineas
          titulo="Varianza acumulada"
          series={[{ nombre: "Varianza acumulada", color: COLOR.A, puntos: acum.map((v, i) => [i + 1, v] as [number, number]) }]}
          x={[1, acum.length]}
          y={[0, 1]}
          etiquetaX="componentes"
          etiquetaY="varianza"
          formatoY={(v) => fmt.porcentaje(v, 0)}
          formatoX={(v) => v.toFixed(0)}
          marcasY={[{ valor: 0.95, etiqueta: "95%" }]}
          marcasX={[{ valor: principal.pca.k95, etiqueta: `${principal.pca.k95} componentes` }]}
          alto={260}
          ancho={430}
        />
        <BarrasH
          titulo="Random Forest: PR-AUC en validación cruzada"
          anchoEtiqueta={170}
          ancho={430}
          max={0.8}
          filas={[
            { etiqueta: "Escalado", valor: rf("Escalado (") },
            { etiqueta: "Escalado + PCA 95%", valor: rf("Escalado + PCA (>=95%"), color: COLOR.peligroso },
            { etiqueta: "Escalado + PCA 2D", valor: rf("Escalado + PCA (2D"), color: COLOR.peligroso },
          ]}
        />
      </Dos>
      <Nota>
        Se necesitan {principal.pca.k95} de {acum.length} componentes para el 95%, y el modelo empeora: la dirección de más
        varianza no es la que separa a los peligrosos. El pipeline final no usa PCA.
      </Nota>
    </>
  );
}

function Seleccion() {
  const filas = tablas.seleccionRasgosCv;
  const subconjuntos = Object.values(metricas.seleccion_rasgos.subconjuntos) as string[][];
  const nucleo = subconjuntos[0].filter((c) => subconjuntos.every((s) => s.includes(c)));
  return (
    <>
      <Lead>Probamos 5 técnicas para quedarnos con menos variables (filtro, wrapper, embebidos y SHAP).</Lead>
      <Bloque>
        <BarrasH
          titulo="PR-AUC en validación cruzada con cada subconjunto (escenario B)"
          anchoEtiqueta={220}
          max={0.85}
          filas={filas.map((f, i) => ({
            etiqueta: f["Método"],
            valor: numero(f, "pr_auc"),
            destacada: i === 0,
            color: f["Método"] === "Todas las variables" ? COLOR.tintaSuave : COLOR.B,
          }))}
        />
      </Bloque>
      <Nota>
        Las {subconjuntos.length} técnicas coinciden en un núcleo de {nucleo.length} variables: {nucleo.map(nombre).join(", ")}. El
        wrapper fue el mejor, pero la mejora cabe dentro de una desviación estándar, así que el modelo final conserva
        todas.
      </Nota>
    </>
  );
}

function Shap() {
  const a = Object.entries(principal.shap.A_completo).slice(0, 6);
  const b = Object.entries(principal.shap.B_sin_MOID).slice(0, 6);
  return (
    <>
      <Lead>SHAP muestra en qué se fija el modelo. Al quitarle el MOID, cambia de estrategia.</Lead>
      <Dos>
        <BarrasH
          titulo="Escenario A: importancia media |SHAP|"
          anchoEtiqueta={180}
          ancho={430}
          color={COLOR.A}
          formato={(v) => v.toFixed(3)}
          filas={a.map(([c, v]) => ({ etiqueta: nombre(c), valor: v as number, destacada: c === "Minimum Orbit Intersection" }))}
        />
        <BarrasH
          titulo="Escenario B: importancia media |SHAP|"
          anchoEtiqueta={180}
          ancho={430}
          color={COLOR.B}
          formato={(v) => v.toFixed(3)}
          filas={b.map(([c, v]) => ({ etiqueta: nombre(c), valor: v as number }))}
        />
      </Dos>
      <Nota>
        En A domina el MOID. En B el peso pasa al tamaño (H y diámetro) y a la geometría de la órbita, con la que el
        modelo aproxima la cercanía que antes le daba el MOID.
      </Nota>
    </>
  );
}

function Knn() {
  const k = principal.knn;
  const pts = (ys: number[]) => k.k.map((kk, i) => [kk, ys[i]] as [number, number]);
  return (
    <>
      <Lead>Con k-NN se ve el equilibrio entre memorizar y generalizar.</Lead>
      <Bloque>
        <GraficaLineas
          titulo="PR-AUC de k-NN según el número de vecinos (escenario B)"
          series={[
            { nombre: "Entrenamiento", color: COLOR.tintaSuave, puntos: pts(k.train), punteada: true },
            {
              nombre: "Validación cruzada",
              color: COLOR.B,
              puntos: pts(k.cv),
              banda: {
                inferior: pts(k.cv.map((v, i) => v - k.cv_std[i])),
                superior: pts(k.cv.map((v, i) => v + k.cv_std[i])),
              },
            },
          ]}
          x={[k.k[0], k.k[k.k.length - 1]]}
          y={[0, 1]}
          etiquetaX="k (vecinos)"
          etiquetaY="PR-AUC"
          formatoX={(v) => v.toFixed(0)}
          marcasX={[{ valor: k.k_optimo_curva, etiqueta: `máximo en k = ${k.k_optimo_curva}` }]}
        />
      </Bloque>
      <Nota>
        Con k = 1 memoriza Train (casi 1.0) y generaliza mal; con k muy grande ambas curvas caen. RandomizedSearchCV eligió k ={" "}
        {String(k.gridsearch.params.clf__n_neighbors)} con pesos {k.gridsearch.params.clf__weights === "distance" ? "por distancia" : "uniformes"}{" "}
        (PR-AUC {fmt.decimal(k.gridsearch.pr_auc)}).
      </Nota>
    </>
  );
}

function Benchmark() {
  const modelos = benchmark("B_sin_MOID")
    .filter((f) => f.Modelo !== "Baseline (Mayoritaria)")
    .sort((x, y) => numero(y, "pr_auc") - numero(x, "pr_auc"))
    .map((f) => f.Modelo);
  return (
    <>
      <Lead>13 modelos con los mismos Pipelines y sus hiperparámetros ajustados, en los tres escenarios.</Lead>
      <Bloque>
        <PuntosEscenarios
          titulo="PR-AUC en validación cruzada agrupada, repetida con 3 semillas"
          series={SERIES_ESC}
          filas={modelos.map((mo) => ({
            etiqueta: mo,
            valores: ESCENARIOS.map((e) => pr(e, mo)),
            destacada: mo === evalB.modelo_nombre,
          }))}
        />
      </Bloque>
      <Nota>
        En A todos rozan 1.0 (copian la regla). En B gana {evalB.modelo_nombre} con {fmt.decimal(pr("B_sin_MOID", evalB.modelo_nombre))}.
        Los modelos lineales caen más: sin MOID la frontera es claramente no lineal.
      </Nota>
    </>
  );
}

function Ajuste() {
  const filas = tablas.evaluacionTest;
  const params = Object.entries(evalB.mejores_params).map(([k, v]) => `${k.replace("clf__", "")} = ${v}`);
  return (
    <>
      <Lead>
        Ajustamos las 13 familias con RandomizedSearchCV (20 combinaciones cada una, validación cruzada agrupada por asteroide) y
        el ganador de cada escenario sale de comparar los modelos ya ajustados.
      </Lead>
      <Cifras>
        <Cifra valor={fmt.decimal(evalB.cv_pr_auc_base, 4)} etiqueta={`${evalB.modelo_nombre} con valores por defecto (PR-AUC CV)`} />
        <Cifra valor={fmt.decimal(evalB.cv_pr_auc_ajustado, 4)} etiqueta="ajustado (CV repetida)" tono="acento" />
      </Cifras>
      <Nota>Mejores parámetros del modelo B: {params.join(" · ")}.</Nota>
      <Bloque>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-[rgba(60,40,20,.25)]">
              <th className="py-1.5">Escenario</th>
              <th>Ganador</th>
              <th>PR-AUC CV (por defecto → ajustado)</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.Escenario} className="border-b border-[rgba(60,40,20,.12)]">
                <td className="py-1.5 font-semibold">{ESC[f.Escenario as Escenario]}</td>
                <td>{f.Modelo}</td>
                <td>{f["CV PR-AUC (base → ajustado)"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Bloque>
    </>
  );
}

function Umbral() {
  const u = principal.umbral_b;
  const pts = (ys: number[]) => u.umbral.map((t, i) => [t, ys[i]] as [number, number]);
  const c05 = confB.umbral_05;
  const cf2 = confB.umbral_f2;
  return (
    <>
      <Lead>
        Por defecto un modelo dice “peligroso” si la probabilidad pasa de 0.5. En defensa planetaria se escapa demasiado, así
        que calibramos el umbral en Validación maximizando F2.
      </Lead>
      <Bloque>
        <GraficaLineas
          titulo="Métricas según el umbral (Validación, modelo B)"
          series={[
            { nombre: "F2", color: COLOR.B, puntos: pts(u.f2) },
            { nombre: "Recall", color: COLOR.A, puntos: pts(u.recall) },
            { nombre: "Precisión", color: COLOR.C, puntos: pts(u.precision) },
          ]}
          x={[0, 1]}
          y={[0, 1]}
          etiquetaX="umbral"
          etiquetaY="métrica"
          marcasX={[
            { valor: u.umbral_f2, etiqueta: `umbral F2 = ${u.umbral_f2.toFixed(3)}`, color: COLOR.B },
            { valor: 0.5, etiqueta: "0.5 por defecto", color: COLOR.tintaSuave },
          ]}
          alto={175}
        />
      </Bloque>
      <Cifras>
        <Cifra valor={`${c05.fn} → ${cf2.fn}`} etiqueta={`peligrosos que se escapan en Test (de ${cf2.fn + cf2.vp})`} tono="peligro" />
        <Cifra valor={`${c05.fp} → ${cf2.fp}`} etiqueta="falsas alarmas a cambio" />
      </Cifras>
    </>
  );
}

function ResultadoB() {
  const t = evalB.test;
  return (
    <>
      <Lead>
        El modelo desplegado ({evalB.modelo_nombre}, sin MOID, umbral {fmt.decimal(evalB.umbral)}) frente a los {confB.umbral_f2.fn + confB.umbral_f2.vp}{" "}
        peligrosos de Test, que nunca vio:
      </Lead>
      <Cifras>
        <Cifra valor={fmt.decimal(t.recall)} etiqueta="Recall" tono="acento" />
        <Cifra valor={fmt.decimal(t.precision)} etiqueta="Precisión" />
        <Cifra valor={fmt.decimal(t.f2)} etiqueta="F2" />
        <Cifra valor={fmt.decimal(t.pr_auc)} etiqueta="PR-AUC" />
      </Cifras>
      <Bloque>
        <MatrizConfusion titulo="Matriz de confusión en Test" {...confB.umbral_f2} />
      </Bloque>
      <Nota>
        Una falsa alarma cuesta una observación de seguimiento; un peligroso que se escapa puede costar mucho más. Por eso
        aceptamos más falsas alarmas.
      </Nota>
    </>
  );
}

function AbcTest() {
  const curvas = principal.pr_test as Record<Escenario, { precision: number[]; recall: number[]; modelo: string }>;
  const filas = tablas.evaluacionTest;
  const prAuc = (e: Escenario) => numero(filas.find((f) => f.Escenario === e)!, "Test PR-AUC");
  return (
    <>
      <Lead>En Test se ve cuánto aporta cada pista: con MOID es casi perfecto; sin tamaño, mucho peor.</Lead>
      <Bloque>
        <GraficaLineas
          titulo="Curvas Precision-Recall en Test"
          series={ESCENARIOS.map((e, i) => ({
            nombre: `${ESC[e]} · ${curvas[e].modelo} (PR-AUC ${prAuc(e).toFixed(3)})`,
            color: SERIES_ESC[i].color,
            puntos: curvas[e].recall.map((r, j) => [r, curvas[e].precision[j]] as [number, number]),
          }))}
          x={[0, 1]}
          y={[0, 1]}
          etiquetaX="recall"
          etiquetaY="precisión"
          marcasY={[{ valor: principal.prevalencia_test, etiqueta: `azar (prevalencia ${principal.prevalencia_test.toFixed(2)})` }]}
          alto={200}
        />
      </Bloque>
    </>
  );
}

function Despliegue() {
  const inf = principal.inferencia as Record<string, string | number | boolean>[];
  return (
    <>
      <Lead>
        Guardamos el pipeline con todo lo necesario para usarlo: columnas, umbral, versiones y la referencia para monitorear.
      </Lead>
      <Dos>
        <div className="flex flex-col gap-4">
        <Cifra valor={`${(principal.modelo.tamano_kb / 1024).toFixed(1)} MB`} etiqueta={principal.modelo.archivo} />
        <Cifra valor={String(principal.modelo.columnas.length)} etiqueta="columnas que exige" />
        <Cifra valor={fmt.decimal(evalB.umbral)} etiqueta="umbral calibrado" tono="acento" />
        </div>
        <div>
        <p className="text-sm font-bold uppercase tracking-[0.08em] text-[color:var(--tinta-suave)]">
          Prueba con 6 acercamientos de Test
        </p>
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-[rgba(60,40,20,.25)]">
              <th className="py-1.5">Asteroide</th>
              <th>Real</th>
              <th>Modelo</th>
              <th>Probabilidad</th>
            </tr>
          </thead>
          <tbody>
            {inf.map((f) => (
              <tr key={String(f["Neo Reference ID"])} className="border-b border-[rgba(60,40,20,.12)]">
                <td className="py-1.5 tabular-nums">{String(f["Neo Reference ID"])}</td>
                <td>{f["Etiqueta Real"] ? "peligroso" : "no"}</td>
                <td className="font-semibold">{f.Peligroso ? "peligroso" : "no"}</td>
                <td className="tabular-nums">{Number(f.Probabilidad).toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Dos>
      <Nota>Si falta una columna, la función responde con un error claro en vez de adivinar.</Nota>
    </>
  );
}

function Monitoreo() {
  const psi = Object.entries(principal.psi).sort((a, b) => (b[1] as number) - (a[1] as number));
  return (
    <>
      <Lead>
        Un modelo se degrada si cambian los asteroides que llegan. El PSI compara cada variable nueva con la de entrenamiento.
      </Lead>
      <Bloque>
        <BarrasH
          titulo="PSI por variable (lote simulado con Test)"
          anchoEtiqueta={190}
          max={0.27}
          color={COLOR.A}
          formato={(v) => v.toFixed(3)}
          marcas={[
            { valor: 0.1, etiqueta: "0.10 vigilar" },
            { valor: 0.25, etiqueta: "0.25 drift", color: COLOR.peligroso },
          ]}
          filas={psi.slice(0, 6).map(([c, v]) => ({ etiqueta: nombre(c), valor: v as number }))}
        />
      </Bloque>
      <Cifras>
        <Cifra valor={fmt.porcentaje(principal.alertas.tasa_lote)} etiqueta="tasa de alertas del lote" />
        <Cifra valor={fmt.porcentaje(principal.alertas.tasa_esperada)} etiqueta="tasa esperada (Validación)" />
      </Cifras>
      <Nota>Todo estable. Si una variable importante pasa de 0.25, o las alertas se desvían más de ±5 puntos, se reentrena.</Nota>
    </>
  );
}

function Catalogo() {
  const c = graficasJpl.catalogo;
  return (
    <>
      <Lead>
        Para probarlo en serio descargamos el catálogo completo de la NASA/JPL (SBDB): una fila por asteroide, así que aquí no
        hay fuga por agrupamiento.
      </Lead>
      <Cifras>
        <Cifra valor={fmt.entero(c.validos)} etiqueta="asteroides cercanos válidos" />
        <Cifra valor={fmt.entero(c.pha)} etiqueta={`peligrosos (${fmt.porcentaje(c.pha / c.validos)})`} tono="peligro" />
        <Cifra valor={fmt.porcentaje(c.acuerdo_regla, 2)} etiqueta="acuerdo regla vs etiqueta" />
      </Cifras>
      <Nota>Catálogo descargado el {c.fecha}. La regla vuelve a coincidir casi siempre con la etiqueta oficial.</Nota>
    </>
  );
}

function Cielo() {
  const anios = graficasJpl.por_anio;
  const [hist, recientes] = graficasJpl.periodos;
  const corte = graficasJpl.anio_corte;
  const pts = (campo: "H_mediana" | "pct_pha") => anios.map((a) => [a.anio, a[campo]] as [number, number]);
  return (
    <>
      <Lead>Los telescopios de hoy encuentran asteroides cada vez más pequeños, y entre ellos hay menos peligrosos.</Lead>
      <Dos>
        <GraficaLineas
          titulo="H mediana de los descubiertos (mayor = más pequeño)"
          series={[{ nombre: "H mediana", color: COLOR.A, puntos: pts("H_mediana") }]}
          x={[anios[0].anio, anios[anios.length - 1].anio]}
          y={[19, 26]}
          etiquetaX="año"
          etiquetaY="H"
          formatoX={(v) => v.toFixed(0)}
          formatoY={(v) => v.toFixed(1)}
          marcasX={[{ valor: corte - 0.5, etiqueta: `corte ${corte}` }]}
          marcasY={[{ valor: 22, etiqueta: "H = 22" }]}
          alto={225}
          ancho={430}
        />
        <GraficaLineas
          titulo="% de peligrosos entre los descubiertos"
          series={[{ nombre: "% PHA", color: COLOR.peligroso, puntos: pts("pct_pha") }]}
          x={[anios[0].anio, anios[anios.length - 1].anio]}
          y={[0, 0.3]}
          etiquetaX="año"
          etiquetaY="% PHA"
          formatoX={(v) => v.toFixed(0)}
          formatoY={(v) => fmt.porcentaje(v, 0)}
          marcasX={[{ valor: corte - 0.5, etiqueta: `corte ${corte}` }]}
          alto={225}
          ancho={430}
        />
      </Dos>
      <Cifras>
        <Cifra valor={`${hist.H_mediana.toFixed(1)} → ${recientes.H_mediana.toFixed(1)}`} etiqueta="H mediana: antes vs desde 2024" />
        <Cifra valor={`${fmt.porcentaje(hist.pct_pha)} → ${fmt.porcentaje(recientes.pct_pha)}`} etiqueta="peligrosos" tono="peligro" />
        <Cifra valor={fmt.decimal(jpl.psi.H, 2)} etiqueta="PSI de H: drift fuerte" />
      </Cifras>
      <Nota>{graficasJpl.anio_actual} es un año incompleto.</Nota>
    </>
  );
}

function Futuro() {
  const p = graficasJpl.particion;
  const t = evalJ.B_sin_MOID.test;
  const vn = p.test - t.positivos - t.falsos_positivos;
  return (
    <>
      <Lead>
        Entrenamos con los asteroides descubiertos hasta {jpl.anio_validacion - 1}, escogimos el umbral con los de{" "}
        {jpl.anio_validacion}–{graficasJpl.anio_corte - 1} y lo probamos con los {fmt.entero(p.test)} descubiertos desde{" "}
        {graficasJpl.anio_corte}, como si ya estuviera en producción.
      </Lead>
      <Dos>
        <MatrizConfusion
          titulo={`Modelo B en Test ${graficasJpl.anio_corte}–${graficasJpl.anio_actual}`}
          vn={vn}
          fp={t.falsos_positivos}
          fn={t.falsos_negativos}
          vp={t.positivos - t.falsos_negativos}
        />
        <div className="flex flex-col gap-4">
          <Cifra valor={`${t.positivos - t.falsos_negativos} de ${t.positivos}`} etiqueta="peligrosos nuevos detectados" tono="acento" />
          <Cifra
            valor={fmt.porcentaje(graficasJpl.alertas_b.tasa_test)}
            etiqueta={`marcados para revisar (${fmt.entero(t.positivos - t.falsos_negativos + t.falsos_positivos)} asteroides)`}
          />
          <Cifra valor={fmt.decimal(evalJ.B_sin_MOID.test_umbral_05.recall)} etiqueta="recall si usáramos el umbral 0.5" tono="peligro" />
        </div>
      </Dos>
    </>
  );
}

function Inciertas() {
  const grandes = tablas.jplCalidadOrbita.filter((f) => f.Poblacion === "Solo grandes (H <= 22)" && f.Grupo !== "Todos");
  const arco = (graficasJpl.por_arco_grandes as Record<string, string | number>[]).find((f) => String(f.Grupo).startsWith("<"));
  return (
    <>
      <Lead>
        Un asteroide recién descubierto suele tener la órbita incierta. Entre los grandes (H ≤ 22), la incertidumbre casi no le
        afecta al recall.
      </Lead>
      <Bloque>
        <BarrasAgrupadas
          titulo="Modelo B en Test, solo asteroides grandes, por calidad de órbita"
          series={[
            { nombre: "Recall", color: COLOR.A },
            { nombre: "Precisión", color: COLOR.B },
          ]}
          grupos={grandes.map((f) => ({ etiqueta: f.Grupo, valores: [numero(f, "Recall"), numero(f, "Precision")] }))}
          notas={grandes.map((f) => `${f["PHA detectados"]} de ${f["PHA reales"]} detectados`)}
          max={1.15}
        />
      </Bloque>
      {arco && (
        <Nota>
          Con menos de 30 días de observación detectó {String(arco["PHA detectados"])} de {String(arco["PHA reales"])}. Matiz: la
          etiqueta de una órbita incierta también es provisional.
        </Nota>
      )}
    </>
  );
}

function SinTamano() {
  const t = (e: Escenario) => evalJ[e].test;
  return (
    <>
      <Lead>Sin H ni diámetro (escenario C) el modelo colapsa: el tamaño es indispensable.</Lead>
      <Bloque>
        <BarrasH
          titulo="PR-AUC en Test 2024–2026 por escenario"
          max={1}
          anchoEtiqueta={210}
          filas={ESCENARIOS.map((e, i) => ({ etiqueta: ESC[e], valor: t(e).pr_auc, color: SERIES_ESC[i].color }))}
        />
      </Bloque>
      <Cifras>
        <Cifra valor={fmt.entero(t("C_sin_definicion").falsos_positivos)} etiqueta="falsas alarmas del escenario C" tono="peligro" />
        <Cifra
          valor={`${t("C_sin_definicion").positivos - t("C_sin_definicion").falsos_negativos} de ${t("C_sin_definicion").positivos}`}
          etiqueta="peligrosos que encuentra"
        />
      </Cifras>
    </>
  );
}

function Decisiones() {
  return (
    <Lista
      items={[
        <>
          <b>Agrupar por asteroide</b> al partir y validar: sin eso las métricas se inflan hasta 22 puntos.
        </>,
        <>
          <b>Desplegar el escenario B</b> (sin MOID): con MOID el modelo solo copia la regla.
        </>,
        <>
          <b>{metricas.escalador_elegido}</b> dentro de Pipelines; <b>sin PCA</b>, porque empeoraba.
        </>,
        <>
          <b>{evalB.modelo_nombre}</b> entre 13 modelos ajustados: PR-AUC en validación cruzada repetida, desempate por F2 y
          estabilidad.
        </>,
        <>
          <b>Umbral {fmt.decimal(evalB.umbral)}</b> calibrado en Validación con F2: menos peligrosos que se escapan.
        </>,
        <>
          <b>Prueba temporal</b> con el catálogo JPL: entrenar con el pasado, escoger el umbral con {jpl.anio_validacion}–
          {graficasJpl.anio_corte - 1} y evaluar con lo recién descubierto.
        </>,
      ]}
    />
  );
}

function Lecciones() {
  return (
    <>
      <Lista
        items={[
          <>La etiqueta es casi una regla física: si el MOID está disponible, aplicar la regla es más simple y explicable.</>,
          <>
            El MOID sale de la órbita (correlación {fmt.decimal(metricas.moid_desde_orbita.correlacion)} con el real): con seis
            variables de geometría orbital, el escenario B llega a PR-AUC {fmt.decimal(metricas.moid_desde_orbita.cv[1].pr_auc)}, casi
            como el A ({fmt.decimal(metricas.moid_desde_orbita.cv[2].pr_auc)}). El modelo rearma la regla.
          </>,
          <>Sin MOID, el modelo generaliza bien en el tiempo y con órbitas inciertas, siempre que conozca el tamaño.</>,
          <>
            En la práctica sirve como <b>filtro de priorización</b>: reduce la lista a revisar sin perder casi ningún peligroso.
          </>,
        ]}
      />
      <p className="mt-5 font-display text-lg font-bold">Límites</p>
      <Lista
        items={[
          <>Test tiene pocos peligrosos: 1 o 2 detecciones mueven el recall varios puntos.</>,
          <>Las probabilidades del {evalB.modelo_nombre} no están calibradas.</>,
          <>Las etiquetas del catálogo son una foto de hoy: las órbitas provisionales cambiarán.</>,
        ]}
      />
    </>
  );
}

function Preguntas() {
  return (
    <div className="flex flex-col gap-4 py-2">
      <Lead>Gracias. Todo lo que vieron sale de dos notebooks y de la carpeta resultados/.</Lead>
      <Lista
        items={[
          <>
            <b>pipeline_asteroides.ipynb</b>: el modelo con nasa.csv.
          </>,
          <>
            <b>catalogo_jpl_asteroides.ipynb</b>: la prueba con el catálogo completo y los recién descubiertos.
          </>,
        ]}
      />
      <Equipo />
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(EVENTO_FINAL))}
        className="boton-plastilina mt-2 inline-flex min-h-12 items-center gap-2 self-start bg-[color:var(--arcilla-roja)] px-6 font-display text-lg font-semibold text-crema"
      >
        ¿Y si no lo detectamos? Ver el final
      </button>
    </div>
  );
}

const CONTENIDO: Record<string, () => ReactNode> = {
  portada: Portada,
  problema: Problema,
  metodo: Metodo,
  desbalance: Desbalance,
  regla: Regla,
  escenarios: Escenarios,
  fuga: Fuga,
  particion: Particion,
  limpieza: Limpieza,
  phik: Phik,
  escalado: Escalado,
  pca: Pca,
  seleccion: Seleccion,
  shap: Shap,
  knn: Knn,
  benchmark: Benchmark,
  ajuste: Ajuste,
  umbral: Umbral,
  "resultado-b": ResultadoB,
  "abc-test": AbcTest,
  despliegue: Despliegue,
  monitoreo: Monitoreo,
  catalogo: Catalogo,
  cielo: Cielo,
  futuro: Futuro,
  inciertas: Inciertas,
  "sin-tamano": SinTamano,
  decisiones: Decisiones,
  lecciones: Lecciones,
  preguntas: Preguntas,
};

export function ContenidoDiapositiva({ id }: { id: string }) {
  const Componente = CONTENIDO[id] ?? CONTENIDO_EXPO[id];
  if (!Componente) throw new Error(`Diapositiva sin contenido: ${id}`);
  return <Componente />;
}
