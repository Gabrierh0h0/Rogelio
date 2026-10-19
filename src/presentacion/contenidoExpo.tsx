/*
 * Contenido de la expo (/expo): 11 paradas, ~10 minutos. Cada parada se arma en capas (la flecha
 * suma una a la vez, ui/Capa.tsx) y, además del papel, trae (EXTRAS_EXPO, ui/CapaExpo.tsx):
 * - lo que dice Rogelio (el dino) en cada capa;
 * - notas satélite alrededor del papel;
 * - etiquetas colgadas de los asteroides que orbitan.
 * Varias cosas se pueden tocar (chips A/B/C, deslizadores de umbral y de año):
 * ese estado vive en estadoExpo.ts. Toda cifra sale de resultados/ (src/data/resultados.ts).
 */
import type { ReactNode } from "react";
import { graficasJpl, metricas, numero, principal, tablas } from "@/data/resultados";
import { fmt } from "@/lib/formato";
import { cn } from "@/lib/utils";
import { BarrasAgrupadas, BarrasH, Cifra, COLOR, GraficaLineas, MatrizConfusion } from "@/graficas/Graficas";
import { TablaPlastilina } from "@/graficas/Tabla";
import { Capa } from "@/ui/Capa";
import { EVENTO_FINAL } from "./cinematica";
import { cambiarExpo, useExpo, type EstadoExpo } from "./estadoExpo";
import { ir } from "./navegacion";
import { benchmark, Cifras, confB, ESC, ESCENARIOS, evalB, evalJ, Lead, Lista, nombre, Nota, Tarjeta, type Escenario } from "./piezas";

/* ------------------------------------------------------------------ piezas de la expo */

/** dos columnas desde tablet (el proyecto completo las pone desde escritorio) */
const Dos = ({ children }: { children: ReactNode }) => <div className="mt-4 grid items-start gap-5 md:grid-cols-2">{children}</div>;

const ESC_CORTO: Record<Escenario, string> = { A_completo: "A", B_sin_MOID: "B", C_sin_definicion: "C" };
const conMas = (v: number) => `+${v.toFixed(1)}`;
const [historico, recientes] = graficasJpl.periodos;
const calidad = graficasJpl.calidad_por_periodo as Record<string, Record<string, number>>;

/** Chips para elegir una opción (A/B/C...). */
function Chips<T extends string>({
  etiqueta,
  valor,
  opciones,
  onCambio,
}: {
  etiqueta: string;
  valor: T;
  opciones: { valor: T; texto: string }[];
  onCambio: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex flex-wrap items-center gap-2">
      <span className="text-[length:var(--texto-etiqueta)] font-bold uppercase tracking-[0.08em] text-[color:var(--tinta-suave)]">{etiqueta}</span>
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          onClick={() => onCambio(o.valor)}
          className={cn("chip-plastilina", valor === o.valor && "chip-plastilina--activo")}
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}

const CHIPS_ESC = ESCENARIOS.map((e) => ({ valor: e, texto: ESC[e] }));

/** Barra partida en segmentos proporcionales (particiones). */
function BarraPartida({ titulo, segmentos }: { titulo: string; segmentos: { etiqueta: string; valor: number; color: string; detalle: string }[] }) {
  const total = segmentos.reduce((a, s) => a + s.valor, 0);
  return (
    <figure>
      <figcaption className="mb-1.5 text-[length:var(--texto-etiqueta)] font-bold uppercase tracking-[0.08em] text-[color:var(--tinta-suave)]">{titulo}</figcaption>
      <div className="flex gap-1">
        {segmentos.map((s) => (
          <div
            key={s.etiqueta}
            className="barra-partida__trozo"
            style={{ flexGrow: s.valor, flexBasis: 0, background: s.color }}
            title={s.detalle}
            tabIndex={0}
            aria-label={`${s.etiqueta}: ${fmt.entero(s.valor)} (${fmt.porcentaje(s.valor / total, 0)}). ${s.detalle}`}
          >
            <span className="font-display text-base font-extrabold leading-none">{s.etiqueta}</span>
            <span className="text-xs font-bold tabular-nums">
              {fmt.entero(s.valor)} · {fmt.porcentaje(s.valor / total, 0)}
            </span>
          </div>
        ))}
      </div>
    </figure>
  );
}

/** Deslizador de plastilina con su lectura. */
function Deslizador({
  id,
  etiqueta,
  min,
  max,
  paso,
  valor,
  onCambio,
  formato,
}: {
  id: string;
  etiqueta: string;
  min: number;
  max: number;
  paso: number;
  valor: number;
  onCambio: (v: number) => void;
  formato: (v: number) => string;
}) {
  return (
    <label htmlFor={id} className="flex flex-wrap items-center gap-3 text-sm font-bold">
      <span className="text-[length:var(--texto-etiqueta)] uppercase tracking-[0.08em] text-[color:var(--tinta-suave)]">{etiqueta}</span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={paso}
        value={valor}
        onChange={(e) => onCambio(Number(e.target.value))}
        className="deslizador min-w-[10rem] flex-1"
      />
      <span className="min-w-[4ch] font-display text-xl font-extrabold tabular-nums text-[color:var(--arcilla-roja)]">{formato(valor)}</span>
    </label>
  );
}

/** Puntitos de plastilina: n en total, `rojos` pintados de peligro. */
function Puntitos({ n, rojos }: { n: number; rojos: number }) {
  return (
    <div className="flex flex-wrap gap-1.5" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className="piedrita size-4"
          style={{ background: i < rojos ? COLOR.peligroso : COLOR.noPeligroso }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ 2 · el problema */

function Problema() {
  const prevalencia = metricas.dataset.prevalencia_peligrosos;
  return (
    <>
      <Capa n={1}>
        <Lead>
          Un asteroide es <b>potencialmente peligroso</b> (PHA) si cumple dos condiciones a la vez. ¿Puede un modelo reconocerlos a
          partir de sus datos?
        </Lead>
        <Dos>
          <Tarjeta titulo="MOID ≤ 0.05 UA" color={COLOR.peligroso}>
            Su órbita pasa cerca de la de la Tierra: a menos de ~7.48 millones de km.
          </Tarjeta>
          <Tarjeta titulo="H ≤ 22.0" color={COLOR.peligroso}>
            Es grande: unos 140 m de diámetro o más.
          </Tarjeta>
        </Dos>
      </Capa>
      <Capa n={2} className="mt-4 grid items-center gap-4 md:grid-cols-[auto_1fr]">
        <Cifra
          valor={fmt.porcentaje(prevalencia)}
          cuenta={{ hasta: prevalencia * 100, formato: (v) => `${v.toFixed(1)}%` }}
          etiqueta="de los acercamientos son peligrosos (≈ 1 de cada 6)"
          tono="peligro"
        />
        <Puntitos n={18} rojos={Math.round(18 * prevalencia)} />
      </Capa>
      <Capa n={3} className="mt-4">
        <p className="max-w-[46ch] text-sm leading-relaxed text-[color:var(--tinta-suave)]">
          Por eso no basta con la exactitud: medimos sobre la clase peligrosa con <b>PR-AUC</b>, <b>F2</b> y <b>Recall</b>.
        </p>
      </Capa>
    </>
  );
}

/* ------------------------------------------------------------------ 3 · dos fuentes, un método */

function Fuente({
  titulo,
  cifra,
  etiqueta,
  filas,
}: {
  titulo: string;
  cifra: number;
  etiqueta: string;
  filas: [string, string][];
}) {
  const { fila } = useExpo();
  return (
    <div className="ficha-fuente">
      <p className="font-display text-xl font-extrabold">{titulo}</p>
      <Cifra valor={fmt.entero(cifra)} cuenta={{ hasta: cifra, formato: (v) => fmt.entero(Math.round(v)) }} etiqueta={etiqueta} tono="acento" />
      <dl className="mt-3 grid gap-1 text-sm">
        {filas.map(([k, v]) => (
          <div
            key={k}
            className={cn("ficha-fuente__fila", fila === k && "ficha-fuente__fila--activa")}
            onMouseEnter={() => cambiarExpo({ fila: k })}
            onMouseLeave={() => cambiarExpo({ fila: null })}
            onFocus={() => cambiarExpo({ fila: k })}
            onBlur={() => cambiarExpo({ fila: null })}
            tabIndex={0}
          >
            <dt className="font-semibold text-[color:var(--tinta-suave)]">{k}</dt>
            <dd className="font-bold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Fuentes() {
  const c = graficasJpl.catalogo;
  return (
    <>
      <Capa n={1}>
        <Lead>Dos catálogos distintos; pasa el dedo por una fila y se marca en los dos.</Lead>
        <Dos>
          <Fuente
            titulo="nasa.csv"
            cifra={metricas.dataset.asteroides_unicos}
            etiqueta="asteroides"
            filas={[
              ["Origen", "Kaggle (foto antigua)"],
              // 751 repetidos: salida impresa de la celda 1.4 de pipeline_asteroides.ipynb
              ["Filas", `${fmt.entero(metricas.dataset.filas)} (751 se repiten)`],
              ["Peligrosos", fmt.porcentaje(metricas.dataset.prevalencia_peligrosos)],
              ["Regla vs etiqueta", fmt.porcentaje(metricas.dataset.acuerdo_regla_cneos, 2)],
              ["Fecha de descubrimiento", "no"],
            ]}
          />
          <Fuente
            titulo="Catálogo JPL"
            cifra={c.validos}
            etiqueta="asteroides"
            filas={[
              ["Origen", `API oficial SBDB (${c.fecha})`],
              ["Filas", "una por asteroide"],
              ["Peligrosos", fmt.porcentaje(c.pha / c.validos)],
              ["Regla vs etiqueta", fmt.porcentaje(c.acuerdo_regla, 2)],
              ["Fecha de descubrimiento", "sí"],
            ]}
          />
        </Dos>
      </Capa>
      <Capa n={2} className="mt-4">
        <p className="text-[length:var(--texto-etiqueta)] font-bold uppercase tracking-[0.08em] text-[color:var(--arcilla-roja)]">Un método para las dos</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {["3 escenarios: A, B y C", "PR-AUC · F2 · Recall", "Umbral calibrado en Validación"].map((t) => (
            <p key={t} className="chip-plastilina chip-plastilina--fijo text-center">
              {t}
            </p>
          ))}
        </div>
      </Capa>
    </>
  );
}

/* ------------------------------------------------------------------ 4 · variables y escenarios */

const VARIABLES_A = ["Minimum Orbit Intersection", ...principal.modelo.columnas];
const QUITADAS: Record<Escenario, string[]> = {
  A_completo: [],
  B_sin_MOID: ["Minimum Orbit Intersection"],
  C_sin_definicion: ["Minimum Orbit Intersection", "Absolute Magnitude", "Est Dia in KM(min)"],
};
const PARA_QUE: Record<Escenario, string> = {
  A_completo: "Techo: con el MOID puede copiar la regla.",
  B_sin_MOID: "El realista: sin el MOID, el que se despliega.",
  C_sin_definicion: "Sin ninguna pista de la regla: ni MOID ni tamaño.",
};

function Escenarios() {
  const { escenario } = useExpo();
  const n = principal.variables_por_escenario[escenario];
  return (
    <>
      <Capa n={1}>
        <Lead>Si el modelo ve el MOID, solo copia la regla. Para saber si aprende algo más, lo entrenamos en tres escenarios.</Lead>
      </Capa>
      <Capa n={2} className="mt-4 grid gap-3">
        <Chips etiqueta="Escenario" valor={escenario} opciones={CHIPS_ESC} onCambio={(v) => cambiarExpo({ escenario: v })} />
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="font-display text-4xl font-extrabold tabular-nums" style={{ color: COLOR[ESC_CORTO[escenario] as "A" | "B" | "C"] }}>
            {n}
          </span>
          <span className="text-sm font-bold text-[color:var(--tinta-suave)]">variables · {PARA_QUE[escenario]}</span>
        </div>
        <ul className="flex flex-wrap gap-1.5" aria-label="Variables del escenario">
          {VARIABLES_A.map((v) => {
            const fuera = QUITADAS[escenario].includes(v);
            return (
              <li key={v} className={cn("pastilla-variable", fuera && "pastilla-variable--fuera")} aria-label={fuera ? `${nombre(v)} (quitada)` : nombre(v)}>
                {nombre(v)}
              </li>
            );
          })}
        </ul>
      </Capa>
      <Capa n={3} className="mt-3">
        <Nota>
          En JPL se usan los mismos escenarios; diámetro y albedo no entran porque faltan en el ~97% de los asteroides (el tamaño ya
          está en H).
        </Nota>
      </Capa>
    </>
  );
}

/* ------------------------------------------------------------------ 5 · partición */

function Particion() {
  const p = metricas.particion;
  const j = graficasJpl.particion;
  const corte = graficasJpl.anio_corte;
  return (
    <>
      <Capa n={1}>
        <Lead>Cada fuente pide su propia partición, y cada conjunto tiene un solo trabajo.</Lead>
        <div className="mt-3">
          <BarraPartida
            titulo="nasa.csv · agrupada por asteroide (el mismo asteroide nunca cae en dos conjuntos)"
            segmentos={[
              { etiqueta: "Train", valor: p.train, color: "oklch(0.78 0.08 230 / 0.55)", detalle: "Entrenar y comparar modelos con validación cruzada." },
              { etiqueta: "Val", valor: p.validacion, color: "oklch(0.82 0.11 80 / 0.7)", detalle: "Solo para calibrar el umbral." },
              { etiqueta: "Test", valor: p.test, color: "oklch(0.75 0.12 40 / 0.6)", detalle: "Se usa una sola vez, al final." },
            ]}
          />
        </div>
      </Capa>
      <Capa n={2} className="mt-4">
        <BarraPartida
          titulo={`JPL · en el tiempo: entrena con lo descubierto antes de ${corte} y prueba con ${corte}–${graficasJpl.anio_actual}`}
          segmentos={[
            { etiqueta: "Train", valor: j.train, color: "oklch(0.78 0.08 230 / 0.55)", detalle: `Descubiertos antes de ${corte}.` },
            { etiqueta: "Val", valor: j.validacion, color: "oklch(0.82 0.11 80 / 0.7)", detalle: `Descubiertos antes de ${corte}; solo para el umbral.` },
            { etiqueta: "Test", valor: j.test, color: "oklch(0.75 0.12 40 / 0.6)", detalle: `Todos los descubiertos desde ${corte}: el modelo nunca los vio.` },
          ]}
        />
      </Capa>
      <Capa n={3} className="mt-4">
        <TablaPlastilina
          compacta
          columnas={[{ titulo: "Conjunto" }, { titulo: "Para qué", alinear: "izquierda" }]}
          filas={[
            { celdas: ["Train", "entrenar y validación cruzada (5 folds)"] },
            { celdas: ["Validación", "solo calibrar el umbral"] },
            { celdas: ["Test", "una sola vez, al final"], destacada: true },
          ]}
        />
      </Capa>
    </>
  );
}

/* ------------------------------------------------------------------ 6 · qué hizo JPL */

function Cielo() {
  const { anio } = useExpo();
  const anios = graficasJpl.por_anio;
  const corte = graficasJpl.anio_corte;
  const elegido = anio ?? anios[anios.length - 1].anio;
  const fila = anios.find((a) => a.anio === elegido) ?? anios[anios.length - 1];
  const dato = (titulo: string, valor: string, color?: string) => (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-[color:var(--tinta-suave)]">{titulo}</dt>
      <dd className="font-display text-2xl font-extrabold tabular-nums" style={{ color }}>
        {valor}
      </dd>
    </div>
  );
  return (
    <>
      <Capa n={1}>
        <Lead>JPL simula producción: entrena con el pasado y prueba con lo que llegó después. Mueve el año:</Lead>
        <div className="mt-3 grid items-center gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <GraficaLineas
            titulo="H mediana de los descubiertos cada año (mayor = más pequeño)"
            series={[{ nombre: "H mediana", color: COLOR.A, puntos: anios.map((a) => [a.anio, a.H_mediana] as [number, number]) }]}
            x={[anios[0].anio, anios[anios.length - 1].anio]}
            y={[19, 26]}
            etiquetaX="año"
            etiquetaY="H"
            formatoX={(v) => v.toFixed(0)}
            formatoY={(v) => v.toFixed(1)}
            marcasX={[
              { valor: corte - 0.5, etiqueta: `corte ${corte}`, color: COLOR.tintaSuave },
              { valor: elegido, etiqueta: String(elegido), color: COLOR.peligroso },
            ]}
            marcasY={[{ valor: 22, etiqueta: "H = 22" }]}
            alto={210}
            ancho={460}
          />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            {dato("Descubiertos", fmt.entero(fila.descubiertos))}
            {dato("H mediana", fila.H_mediana.toFixed(1))}
            {dato("Peligrosos", fmt.porcentaje(fila.pct_pha), COLOR.peligroso)}
            {dato("Grandes (H ≤ 22)", fmt.porcentaje(fila.pct_grandes))}
          </dl>
        </div>
        <Deslizador
          id="deslizador-anio"
          etiqueta="Año"
          min={anios[0].anio}
          max={anios[anios.length - 1].anio}
          paso={1}
          valor={elegido}
          onCambio={(v) => cambiarExpo({ anio: v })}
          formato={(v) => String(v)}
        />
      </Capa>
      <Capa n={2} className="mt-3">
        <TablaPlastilina
          compacta
          columnas={[{ titulo: "" }, { titulo: `Antes de ${corte}` }, { titulo: `${corte}–${graficasJpl.anio_actual}` }]}
          filas={[
            { celdas: ["H mediana", historico.H_mediana.toFixed(1), recientes.H_mediana.toFixed(1)] },
            { celdas: ["Peligrosos", fmt.porcentaje(historico.pct_pha), fmt.porcentaje(recientes.pct_pha)], destacada: true },
          ]}
        />
      </Capa>
      <Capa n={3} className="mt-2">
        <Nota>Es un cambio real de distribución (drift): el modelo tiene que aguantarlo para servir con los asteroides nuevos.</Nota>
      </Capa>
    </>
  );
}

/* ------------------------------------------------------------------ 7 · validación cruzada */

function DiagramaFolds() {
  return (
    <div className="grid gap-1" role="img" aria-label="Validación cruzada de 5 folds: en cada vuelta un fold distinto es el de prueba">
      {[0, 1, 2, 3, 4].map((vuelta) => (
        <div key={vuelta} className="fila-fold flex items-center gap-1" style={{ animationDelay: `calc(var(--cuadro) * ${vuelta * 2})` }}>
          <span className="w-16 text-xs font-bold text-[color:var(--tinta-suave)]">vuelta {vuelta + 1}</span>
          {[0, 1, 2, 3, 4].map((f) => (
            <span key={f} className={cn("celda-fold", f === vuelta && "celda-fold--prueba")} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Validacion() {
  const { escenario } = useExpo();
  const filas = benchmark(escenario);
  const prDe = (m: string) => numero(filas.find((f) => f.Modelo === m)!, "pr_auc");
  const elegidos = [
    ...["Bagging", "Gradient Boosting", "Random Forest", "Regresión Logística"].sort((x, y) => prDe(y) - prDe(x)),
    "Baseline (Mayoritaria)",
  ];
  const mejor = filas.filter((f) => f.Modelo !== "Baseline (Mayoritaria)").sort((x, y) => numero(y, "pr_auc") - numero(x, "pr_auc"))[0]?.Modelo;
  return (
    <>
      <Capa n={1} className="grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Lead>
          Cada modelo se entrena 5 veces; en cada vuelta se prueba con un fold que no vio. Todo va dentro de un Pipeline, así que el
          escalado nunca mira los datos de prueba.
        </Lead>
        <DiagramaFolds />
      </Capa>
      <Capa n={2} className="mt-3 grid gap-2">
        <Chips etiqueta="Escenario" valor={escenario} opciones={CHIPS_ESC} onCambio={(v) => cambiarExpo({ escenario: v })} />
        <TablaPlastilina
          titulo="nasa.csv · StratifiedGroupKFold (agrupado por asteroide)"
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
              destacada: m === mejor,
              atenuada: m.startsWith("Baseline"),
            };
          })}
        />
      </Capa>
      <Capa n={3} className="mt-2">
        <Nota>Diferencias menores al ± (~0.06) son ruido: por eso el criterio fue PR-AUC y, en empate, F2 y estabilidad.</Nota>
      </Capa>
    </>
  );
}

/* ------------------------------------------------------------------ 8 · métricas y umbral */

function enUmbral(u: number) {
  const ub = principal.umbral_b;
  let k = 0;
  for (let i = 0; i < ub.umbral.length; i++) if (Math.abs(ub.umbral[i] - u) < Math.abs(ub.umbral[k] - u)) k = i;
  return { f2: ub.f2[k], recall: ub.recall[k], precision: ub.precision[k] };
}

function Metricas() {
  const { umbral } = useExpo();
  const ub = principal.umbral_b;
  const u = umbral ?? ub.umbral_f2;
  const m = enUmbral(u);
  const j = evalJ.B_sin_MOID;
  const pts = (ys: number[]) => ub.umbral.map((t, i) => [t, ys[i]] as [number, number]);
  return (
    <>
      <Capa n={1} className="grid gap-3 md:grid-cols-3">
        <Tarjeta titulo="PR-AUC" color={COLOR.A}>
          Qué tan bien pone a los peligrosos por encima. Su azar es la prevalencia, no 0.5.
        </Tarjeta>
        <Tarjeta titulo="F2 = 5·P·R / (4·P + R)" color={COLOR.B}>
          Precisión y recall, con el doble de peso al recall.
        </Tarjeta>
        <Tarjeta titulo="Recall" color={COLOR.peligroso}>
          De los peligrosos, cuántos detecta. El peor error es que se escape uno.
        </Tarjeta>
      </Capa>
      <Capa n={2} className="mt-3 grid gap-2">
        <GraficaLineas
          titulo="Modelo B en Validación: las métricas según el umbral"
          series={[
            { nombre: "F2", color: COLOR.B, puntos: pts(ub.f2) },
            { nombre: "Recall", color: COLOR.A, puntos: pts(ub.recall) },
            { nombre: "Precisión", color: COLOR.C, puntos: pts(ub.precision) },
          ]}
          x={[0, 1]}
          y={[0, 1]}
          etiquetaX="umbral"
          etiquetaY="métrica"
          marcasX={[
            { valor: u, etiqueta: `umbral ${u.toFixed(2)}`, color: COLOR.peligroso },
            { valor: 0.5, etiqueta: "0.5", color: COLOR.tintaSuave },
          ]}
          alto={128}
        />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Deslizador id="deslizador-umbral" etiqueta="Umbral" min={0.05} max={0.95} paso={0.01} valor={u} onCambio={(v) => cambiarExpo({ umbral: v })} formato={(v) => v.toFixed(2)} />
          <span className="text-sm font-bold tabular-nums">
            F2 {fmt.decimal(m.f2)} · Recall {fmt.decimal(m.recall)} · Precisión {fmt.decimal(m.precision)}
          </span>
          <button type="button" className="chip-plastilina" onClick={() => cambiarExpo({ umbral: null })}>
            Ir al calibrado ({ub.umbral_f2.toFixed(2)})
          </button>
        </div>
      </Capa>
      <Capa n={3} className="mt-3">
        <TablaPlastilina
          compacta
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
      </Capa>
    </>
  );
}

/* ------------------------------------------------------------------ 9 · resultados en nasa.csv */

function ResultadosNasa() {
  const { curvas } = useExpo();
  const t = evalB.test;
  const c = confB.umbral_f2;
  const pr = principal.pr_test as Record<Escenario, { precision: number[]; recall: number[]; modelo: string }>;
  const prAuc = (e: Escenario) => numero(tablas.evaluacionTest.find((f) => f.Escenario === e)!, "Test PR-AUC");
  const colores: Record<Escenario, string> = { A_completo: COLOR.A, B_sin_MOID: COLOR.B, C_sin_definicion: COLOR.C };
  const cuenta = (v: number) => ({ hasta: v, formato: (x: number) => x.toFixed(3) });
  return (
    <>
      <Capa n={1}>
        <Cifras>
          <Cifra valor={fmt.decimal(t.recall)} cuenta={cuenta(t.recall)} etiqueta="Recall" tono="acento" />
          <Cifra valor={fmt.decimal(t.precision)} cuenta={cuenta(t.precision)} etiqueta="Precisión" />
          <Cifra valor={fmt.decimal(t.f2)} cuenta={cuenta(t.f2)} etiqueta="F2" />
          <Cifra valor={fmt.decimal(t.pr_auc)} cuenta={cuenta(t.pr_auc)} etiqueta="PR-AUC" />
        </Cifras>
      </Capa>
      <Dos>
        <Capa n={1}>
          <MatrizConfusion titulo={`${evalB.modelo_nombre} · escenario B · Test`} {...c} animada />
        </Capa>
        <Capa n={2} className="grid gap-2">
          <GraficaLineas
            titulo="Curvas Precision-Recall en Test"
            series={ESCENARIOS.filter((e) => curvas[e]).map((e) => ({
              nombre: `${ESC_CORTO[e]} (PR-AUC ${prAuc(e).toFixed(3)})`,
              color: colores[e],
              puntos: pr[e].recall.map((r, i) => [r, pr[e].precision[i]] as [number, number]),
            }))}
            x={[0, 1]}
            y={[0, 1]}
            etiquetaX="recall"
            etiquetaY="precisión"
            alto={175}
            ancho={420}
          />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Mostrar curvas">
            {ESCENARIOS.map((e) => (
              <button
                key={e}
                type="button"
                aria-pressed={curvas[e]}
                onClick={() => cambiarExpo({ curvas: { ...curvas, [e]: !curvas[e] } })}
                className={cn("chip-plastilina", curvas[e] && "chip-plastilina--activo")}
                style={{ borderColor: colores[e] }}
              >
                {ESC[e]}
              </button>
            ))}
          </div>
        </Capa>
      </Dos>
      <Capa n={3} className="mt-2">
        <Nota>
          Con el umbral 0.5 se escapaban {confB.umbral_05.fn}; con el calibrado, {c.fn}. A cambio, las falsas alarmas pasan de{" "}
          {confB.umbral_05.fp} a {c.fp}: cada una cuesta solo una observación más.
        </Nota>
      </Capa>
    </>
  );
}

/* ------------------------------------------------------------------ 10 · resultados en JPL */

function Embudo({ pasos }: { pasos: { etiqueta: string; valor: number; color: string }[] }) {
  const max = pasos[0].valor;
  return (
    <figure className="grid gap-1.5">
      <figcaption className="text-[length:var(--texto-etiqueta)] font-bold uppercase tracking-[0.08em] text-[color:var(--tinta-suave)]">
        El filtro: de todos los nuevos a la lista para revisar
      </figcaption>
      {pasos.map((p, i) => (
        <div key={p.etiqueta} className="embudo-fila grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2" style={{ animationDelay: `calc(var(--cuadro) * ${i * 3})` }}>
          <div className="relative h-7">
            <div className="piedrita absolute inset-y-0 left-0" style={{ width: `${Math.max(1.5, (p.valor / max) * 100)}%`, background: p.color }} />
            <span className="absolute inset-y-0 left-2 flex items-center text-xs font-bold">{p.etiqueta}</span>
          </div>
          <span className="font-display text-lg font-extrabold tabular-nums">{fmt.entero(p.valor)}</span>
        </div>
      ))}
    </figure>
  );
}

function ResultadosJpl() {
  const t = evalJ.B_sin_MOID.test;
  const p = graficasJpl.particion;
  const detectados = t.positivos - t.falsos_negativos;
  const grandes = tablas.jplCalidadOrbita.filter((f) => f.Poblacion === "Solo grandes (H <= 22)" && f.Grupo !== "Todos");
  return (
    <>
      <Capa n={1}>
        <Lead>
          Entrenado solo con el pasado, el modelo B probado con los {fmt.entero(p.test)} asteroides descubiertos desde {graficasJpl.anio_corte}:
        </Lead>
      </Capa>
      <Dos>
        <Capa n={1}>
          <MatrizConfusion
            titulo={`Test ${graficasJpl.anio_corte}–${graficasJpl.anio_actual}`}
            vn={p.test - t.positivos - t.falsos_positivos}
            fp={t.falsos_positivos}
            fn={t.falsos_negativos}
            vp={detectados}
            animada
          />
        </Capa>
        <Capa n={2}>
          <Embudo
            pasos={[
              { etiqueta: "nuevos", valor: p.test, color: "oklch(0.78 0.08 230 / 0.55)" },
              { etiqueta: "marcados", valor: detectados + t.falsos_positivos, color: "oklch(0.82 0.11 80 / 0.75)" },
              { etiqueta: "peligrosos de verdad", valor: detectados, color: "oklch(0.7 0.14 35 / 0.7)" },
            ]}
          />
        </Capa>
      </Dos>
      <Capa n={3} className="mt-3">
        <BarrasAgrupadas
          titulo="Solo asteroides grandes (H ≤ 22), según qué tan segura es su órbita"
          series={[
            { nombre: "Recall", color: COLOR.A },
            { nombre: "Precisión", color: COLOR.B },
          ]}
          grupos={grandes.map((f) => ({ etiqueta: f.Grupo, valores: [numero(f, "Recall"), numero(f, "Precision")] }))}
          notas={grandes.map((f) => `${f["PHA detectados"]} de ${f["PHA reales"]}`)}
          max={1.15}
          alto={140}
        />
      </Capa>
    </>
  );
}

/* ------------------------------------------------------------------ 11 · conclusiones */

/** Cifra clave de cada parada; al tocarla se vuelve a esa parada. */
const REPASO = [
  { texto: `${fmt.porcentaje(metricas.dataset.prevalencia_peligrosos)} peligrosos`, ir: 1 },
  { texto: `+${Number((principal.fuga as Record<string, string | number>[]).find((f) => f.Escenario === "C_sin_definicion")!["Inflado F1 (puntos)"]).toFixed(1)} F1 si no agrupas`, ir: 4 },
  { texto: `${evalB.modelo_nombre} ${fmt.decimal(numero(benchmark("B_sin_MOID").find((f) => f.Modelo === evalB.modelo_nombre)!, "pr_auc"))}`, ir: 6 },
  { texto: `umbral ${fmt.decimal(evalB.umbral, 2)}`, ir: 7 },
  { texto: `recall ${fmt.decimal(evalB.test.recall)}`, ir: 8 },
  { texto: `${evalJ.B_sin_MOID.test.positivos - evalJ.B_sin_MOID.test.falsos_negativos} de ${evalJ.B_sin_MOID.test.positivos} del futuro`, ir: 9 },
];

function Conclusiones() {
  const t = evalJ.B_sin_MOID.test;
  return (
    <>
      <Capa n={1} className="mt-2 grid gap-3 md:grid-cols-3">
        <Tarjeta titulo="La etiqueta es casi una regla" color={COLOR.A}>
          Con el MOID el modelo solo la copia. Y el MOID sale de la órbita: con geometría orbital, B llega a{" "}
          {fmt.decimal(metricas.moid_desde_orbita.cv[1].pr_auc)}, casi como A.
        </Tarjeta>
        <Tarjeta titulo="Sin MOID sí generaliza" color={COLOR.B}>
          Recall {fmt.decimal(evalB.test.recall)} en nasa.csv y {t.positivos - t.falsos_negativos} de {t.positivos} peligrosos del futuro en
          JPL, siempre que conozca el tamaño.
        </Tarjeta>
        <Tarjeta titulo="Sirve como filtro" color={COLOR.peligroso}>
          Revisar el {fmt.porcentaje(graficasJpl.alertas_b.tasa_test)} de los nuevos encuentra casi todos los peligrosos.
        </Tarjeta>
      </Capa>
      <Capa n={1} className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[length:var(--texto-etiqueta)] font-bold uppercase tracking-[0.08em] text-[color:var(--tinta-suave)]">Repaso</span>
        {REPASO.map((r) => (
          <button key={r.texto} type="button" className="chip-plastilina" onClick={() => ir(r.ir)} title={`Ir al paso ${r.ir + 1}`}>
            {r.texto}
          </button>
        ))}
      </Capa>
      <Capa n={2} className="mt-5 flex flex-wrap items-center gap-4">
        <p className="font-display text-[clamp(1.6rem,1.1rem+1.6vw,2.4rem)] font-extrabold leading-none">¿Preguntas?</p>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(EVENTO_FINAL))}
          className="boton-plastilina inline-flex min-h-12 items-center gap-2 bg-[color:var(--arcilla-roja)] px-6 font-display text-lg font-semibold text-crema"
        >
          ¿Y si no lo detectamos? Ver el final
        </button>
      </Capa>
    </>
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

/* ================================================================== alrededor del papel */

export type EtiquetaVista = { texto: string; tono?: "peligro" | "acento" | "ok"; tachada?: boolean; ir?: number };
type NotaSatelite = { capa: number; lugar: "arriba" | "abajo"; titulo: string; cuerpo: () => ReactNode; giro?: number };
export type ExtrasPaso = {
  /** lo que dice Rogelio en cada capa */
  boca: string[];
  notas?: NotaSatelite[];
  etiquetas?: { capa: number; items: (e: EstadoExpo) => EtiquetaVista[] }[];
};

const fija = (items: EtiquetaVista[]) => () => items;
const Mini = ({ children }: { children: ReactNode }) => <div className="mt-1 text-sm leading-snug">{children}</div>;
const Grande = ({ children, tono }: { children: ReactNode; tono?: string }) => (
  <p className="font-display text-3xl font-extrabold leading-none tabular-nums" style={{ color: tono }}>
    {children}
  </p>
);

function ShapNota() {
  const { escenario } = useExpo();
  const esc = escenario === "A_completo" ? "A_completo" : "B_sin_MOID";
  const top = Object.entries(principal.shap[esc]).slice(0, 4);
  return (
    <>
      <BarrasH
        titulo={`Escenario ${ESC_CORTO[esc]}: importancia |SHAP|`}
        anchoEtiqueta={112}
        ancho={250}
        color={esc === "A_completo" ? COLOR.A : COLOR.B}
        formato={(v) => v.toFixed(3)}
        filas={top.map(([c, v]) => ({ etiqueta: nombre(c), valor: v as number }))}
      />
      {escenario === "C_sin_definicion" && <Mini>SHAP se calculó para A y B; aquí se muestra B.</Mini>}
    </>
  );
}

function TamanoNota() {
  return (
    <BarrasH
      titulo="% de grandes (H ≤ 22)"
      anchoEtiqueta={96}
      ancho={250}
      max={0.4}
      color={COLOR.A}
      formato={(v) => fmt.porcentaje(v)}
      filas={[
        { etiqueta: `antes de ${graficasJpl.anio_corte}`, valor: historico.pct_H_menor_22 },
        { etiqueta: `${graficasJpl.anio_corte}–${graficasJpl.anio_actual}`, valor: recientes.pct_H_menor_22, destacada: true },
      ]}
    />
  );
}

function CalidadNota() {
  const fila = (periodo: string) => {
    const c = calidad[periodo];
    return (
      <div key={periodo}>
        <p className="text-xs font-bold text-[color:var(--tinta-suave)]">{periodo}</p>
        <div className="mt-0.5 flex h-4 overflow-hidden rounded-full" aria-label={`${periodo}: ${Object.entries(c).map(([k, v]) => `${k} ${v}%`).join(", ")}`}>
          <span style={{ width: `${c["Buena (U 0-3)"]}%`, background: COLOR.A }} />
          <span style={{ width: `${c["Media (U 4-6)"]}%`, background: COLOR.B }} />
          <span style={{ width: `${c["Incierta (U 7-9)"]}%`, background: COLOR.peligroso }} />
        </div>
      </div>
    );
  };
  return (
    <div className="grid gap-2">
      {fila(historico.periodo)}
      {fila(recientes.periodo)}
      <p className="text-xs font-bold">
        <span style={{ color: COLOR.A }}>■</span> buena <span style={{ color: COLOR.B }}>■</span> media{" "}
        <span style={{ color: COLOR.peligroso }}>■</span> incierta: {calidad[historico.periodo]["Incierta (U 7-9)"]}% →{" "}
        {calidad[recientes.periodo]["Incierta (U 7-9)"]}%
      </p>
    </div>
  );
}

const baseline = (esc: Escenario) => benchmark(esc).find((f) => f.Modelo === "Baseline (Mayoritaria)")!;
const ganadorB = (esc: Escenario) => benchmark(esc).find((f) => f.Modelo === evalB.modelo_nombre)!;
const jplBagging = tablas.jplBenchmarkCv.find((f) => f.Escenario === "B_sin_MOID" && f.Modelo === "Bagging")!;
const inflado = (esc: Escenario) =>
  Number((principal.fuga as Record<string, string | number>[]).find((f) => f.Escenario === esc)!["Inflado F1 (puntos)"]);
const rescatados = confB.umbral_05.fn - confB.umbral_f2.fn;
const jplDetectados = evalJ.B_sin_MOID.test.positivos - evalJ.B_sin_MOID.test.falsos_negativos;
const jplMarcados = jplDetectados + evalJ.B_sin_MOID.test.falsos_positivos;
const arcoCorto = (graficasJpl.por_arco_grandes as Record<string, string | number>[]).find((f) => String(f.Grupo).startsWith("<"))!;

export const EXTRAS_EXPO: Record<string, ExtrasPaso> = {
  portada: {
    boca: ["¡Hola! Soy Rogelio. Hoy les cuento si nos va a caer un asteroide."],
    etiquetas: [
      {
        capa: 1,
        items: fija([
          { texto: `${fmt.entero(metricas.dataset.filas)} acercamientos` },
          { texto: `${fmt.entero(graficasJpl.catalogo.validos)} asteroides de JPL` },
          { texto: "2 notebooks" },
        ]),
      },
    ],
  },
  "x-problema": {
    boca: ["Dos condiciones a la vez: que pase cerca y que sea grande.", "Solo ≈ 1 de cada 6 es peligroso…", "Si digo siempre «no», acierto el 84%… ¡y no salvo a nadie!"],
    notas: [
      {
        capa: 3,
        lugar: "abajo",
        titulo: "El modelo perezoso",
        cuerpo: () => (
          <>
            <Grande tono={COLOR.peligroso}>{fmt.porcentaje(numero(baseline("B_sin_MOID"), "accuracy"))}</Grande>
            <Mini>de exactitud en validación cruzada diciendo siempre «no»… y detecta 0 peligrosos (recall {fmt.decimal(numero(baseline("B_sin_MOID"), "recall"))}).</Mini>
          </>
        ),
      },
    ],
    etiquetas: [
      {
        capa: 2,
        items: () => [
          { texto: "peligroso", tono: "peligro" },
          ...Array.from({ length: 4 }, () => ({ texto: "no peligroso", tono: "ok" as const })),
        ],
      },
    ],
  },
  "x-fuentes": {
    boca: ["Dos catálogos muy distintos…", "…y las mismas reglas de juego para los dos."],
    notas: [
      {
        capa: 1,
        lugar: "arriba",
        titulo: "nasa.csv repite asteroides",
        // 751: salida impresa de la celda 1.4 de pipeline_asteroides.ipynb
        cuerpo: () => (
          <>
            <Grande>751</Grande>
            <Mini>asteroides aparecen más de una vez (son acercamientos): hay que partir por asteroide.</Mini>
          </>
        ),
      },
      {
        capa: 2,
        lugar: "abajo",
        titulo: "JPL trae la fecha",
        cuerpo: () => <Mini>Con la fecha de descubrimiento se puede entrenar con el pasado y probar con el futuro, como en producción.</Mini>,
      },
    ],
    etiquetas: [
      {
        capa: 1,
        items: fija([
          { texto: `nasa.csv: ${fmt.porcentaje(metricas.dataset.prevalencia_peligrosos)} peligrosos`, tono: "peligro" },
          { texto: `JPL: ${fmt.porcentaje(graficasJpl.catalogo.pha / graficasJpl.catalogo.validos)} peligrosos`, tono: "peligro" },
        ]),
      },
    ],
  },
  "x-escenarios": {
    boca: [
      `Primero, limpiar la mesa: de 40 columnas quedan ${principal.variables_por_escenario.A_completo}.`,
      "Sin el MOID tengo que pensar de verdad.",
      "Sin MOID me fijo en el tamaño: H y diámetro.",
    ],
    notas: [
      {
        capa: 1,
        lugar: "arriba",
        titulo: "La limpieza",
        // 40 columnas: assert data.shape == (4687, 40) en la celda 1.4 del notebook
        cuerpo: () => (
          <>
            <Grande>40 → {principal.variables_por_escenario.A_completo}</Grande>
            <Mini>Fuera: IDs y fechas · constantes (Orbiting Body, Equinox) · la misma medida en varias unidades.</Mini>
          </>
        ),
      },
      { capa: 3, lugar: "abajo", titulo: "Qué mira el modelo (SHAP)", cuerpo: () => <ShapNota /> },
    ],
    etiquetas: [
      {
        capa: 2,
        items: (e) => [
          { texto: "MOID", tachada: e.escenario !== "A_completo", tono: "peligro" },
          { texto: "H", tachada: e.escenario === "C_sin_definicion", tono: "acento" },
          { texto: "diámetro", tachada: e.escenario === "C_sin_definicion", tono: "acento" },
        ],
      },
    ],
  },
  "x-particion": {
    boca: ["Cada asteroide en un solo grupo: nada de copiarse.", "JPL: aprender del pasado, probar con el futuro.", "¡Mezclarlos infla las notas hasta 22 puntos!"],
    notas: [
      {
        capa: 3,
        lugar: "arriba",
        titulo: "Si no se agrupa",
        cuerpo: () => (
          <>
            <Grande tono={COLOR.peligroso}>
              {conMas(inflado("B_sin_MOID"))} / {conMas(inflado("C_sin_definicion"))}
            </Grande>
            <Mini>puntos de F1 inflados en los escenarios B y C: el modelo «reconoce» al asteroide en vez de aprender.</Mini>
          </>
        ),
      },
    ],
    etiquetas: [
      {
        capa: 2,
        items: fija([
          { texto: `antes de ${graficasJpl.anio_corte}: entrena` },
          { texto: `${graficasJpl.anio_corte}–${graficasJpl.anio_actual}: prueba`, tono: "acento" },
        ]),
      },
    ],
  },
  "x-cielo": {
    boca: ["Muevan el año: miren cómo cambia el cielo.", "Hoy se descubren asteroides más chiquitos.", "El modelo tiene que aguantar ese cambio."],
    notas: [
      { capa: 2, lugar: "arriba", titulo: "Órbitas cada vez más inciertas", cuerpo: () => <CalidadNota /> },
      { capa: 3, lugar: "abajo", titulo: "Cada vez más pequeños", cuerpo: () => <TamanoNota /> },
    ],
    etiquetas: [
      {
        capa: 2,
        items: fija([
          { texto: `H ${historico.H_mediana.toFixed(1)} → ${recientes.H_mediana.toFixed(1)}`, tono: "acento" },
          { texto: `peligrosos ${fmt.porcentaje(historico.pct_pha)} → ${fmt.porcentaje(recientes.pct_pha)}`, tono: "peligro" },
        ]),
      },
    ],
  },
  "x-validacion": {
    boca: [
      "5 vueltas: siempre se prueba con lo que no vio.",
      `En el escenario realista gana ${evalB.modelo_nombre}.`,
      evalJ.B_sin_MOID.modelo_nombre === evalB.modelo_nombre ? "¡Y en JPL gana el mismo!" : `En JPL gana ${evalJ.B_sin_MOID.modelo_nombre}.`,
    ],
    notas: [
      {
        capa: 2,
        lugar: "arriba",
        titulo: "La exactitud engaña",
        cuerpo: () => (
          <Mini>
            Baseline: <b>{fmt.decimal(numero(baseline("B_sin_MOID"), "accuracy"))}</b> sin detectar ninguno. {evalB.modelo_nombre}:{" "}
            <b>{fmt.decimal(numero(ganadorB("B_sin_MOID"), "accuracy"))}</b>. Casi igual… y uno detecta, el otro no.
          </Mini>
        ),
      },
      {
        capa: 3,
        lugar: "abajo",
        titulo: "En JPL",
        cuerpo: () => (
          <>
            <Grande tono={COLOR.B}>
              {fmt.decimal(numero(jplBagging, "pr_auc"))} ± {fmt.decimal(numero(jplBagging, "pr_auc_std"))}
            </Grande>
            <Mini>PR-AUC de Bagging en B, con StratifiedKFold (una fila por asteroide).</Mini>
          </>
        ),
      },
    ],
    etiquetas: [{ capa: 1, items: fija([1, 2, 3, 4, 5].map((k) => ({ texto: `fold ${k}`, tono: k === 1 ? ("peligro" as const) : undefined }))) }],
  },
  "x-metricas": {
    boca: [
      "Lo que más importa: que no se escape ninguno.",
      "Muevan el umbral: más bajo, menos se escapan.",
      `Calibrado: ${confB.umbral_f2.vp} de ${confB.umbral_f2.vp + confB.umbral_f2.fn} y ${jplDetectados} de ${evalJ.B_sin_MOID.test.positivos}.`,
    ],
    notas: [
      {
        capa: 1,
        lugar: "arriba",
        titulo: "La regla del juego",
        cuerpo: () => <Mini>Una falsa alarma cuesta una observación más; un peligroso que se escapa puede costar mucho más. Por eso el recall pesa el doble (F2).</Mini>,
      },
      {
        capa: 3,
        lugar: "abajo",
        titulo: "Lo que cuesta",
        cuerpo: () => (
          <>
            <Grande>
              {confB.umbral_05.fp} → {confB.umbral_f2.fp}
            </Grande>
            <Mini>falsas alarmas en nasa.csv, a cambio de rescatar {rescatados} peligrosos.</Mini>
          </>
        ),
      },
    ],
    etiquetas: [
      {
        capa: 2,
        items: (e) => {
          const m = enUmbral(e.umbral ?? principal.umbral_b.umbral_f2);
          return [{ texto: `recall ${fmt.decimal(m.recall)}`, tono: "acento" }, { texto: `precisión ${fmt.decimal(m.precision)}` }];
        },
      },
    ],
  },
  "x-resultados-nasa": {
    boca: [
      `Atrapé ${confB.umbral_f2.vp} de ${confB.umbral_f2.vp + confB.umbral_f2.fn} en el examen final.`,
      "Con MOID es fácil; sin tamaño, mucho más difícil.",
      `Bajar el umbral rescató ${rescatados} peligrosos.`,
    ],
    notas: [
      {
        capa: 1,
        lugar: "arriba",
        titulo: "Test = examen final",
        cuerpo: () => (
          <Mini>
            {fmt.entero(metricas.particion.test)} acercamientos que el modelo nunca vio; {confB.umbral_f2.vp + confB.umbral_f2.fn} son peligrosos.
          </Mini>
        ),
      },
    ],
    etiquetas: [
      {
        capa: 1,
        items: fija([
          { texto: `${confB.umbral_f2.vp} detectados`, tono: "ok" },
          { texto: `${confB.umbral_f2.fn} se escaparon`, tono: "peligro" },
          { texto: `${confB.umbral_f2.fp} falsas alarmas`, tono: "acento" },
        ]),
      },
    ],
  },
  "x-resultados-jpl": {
    boca: [
      `¡${jplDetectados} de ${evalJ.B_sin_MOID.test.positivos} asteroides del futuro!`,
      `Solo hay que revisar ${fmt.entero(jplMarcados)} de ${fmt.entero(graficasJpl.particion.test)}.`,
      "Ni las órbitas inciertas me engañan.",
    ],
    notas: [
      {
        capa: 1,
        lugar: "arriba",
        titulo: "Entrenado con el pasado",
        cuerpo: () => (
          <Mini>
            Hasta {graficasJpl.anio_corte - 1} para aprender; {graficasJpl.anio_corte}–{graficasJpl.anio_actual} para el examen. Umbral calibrado:{" "}
            {fmt.decimal(evalJ.B_sin_MOID.umbral, 2)}.
          </Mini>
        ),
      },
      {
        capa: 3,
        lugar: "abajo",
        titulo: "Sin tamaño (C), colapsa",
        cuerpo: () => (
          <>
            <Grande tono={COLOR.peligroso}>{fmt.decimal(evalJ.C_sin_definicion.test.pr_auc)}</Grande>
            <Mini>de PR-AUC y {fmt.entero(evalJ.C_sin_definicion.test.falsos_positivos)} falsas alarmas: el tamaño es indispensable.</Mini>
          </>
        ),
      },
    ],
    etiquetas: [
      {
        capa: 2,
        items: fija([
          { texto: `${fmt.porcentaje(graficasJpl.alertas_b.tasa_test)} para revisar`, tono: "acento" },
          { texto: `${fmt.entero(evalJ.B_sin_MOID.test.falsos_positivos)} falsas alarmas` },
        ]),
      },
      { capa: 3, items: fija([{ texto: `${arcoCorto["PHA detectados"]} de ${arcoCorto["PHA reales"]} con < 30 días`, tono: "ok" }]) },
    ],
  },
  "x-conclusiones": {
    boca: ["¡Lo atrapé a tiempo!", "¿Preguntas? Y si quieren… vean qué pasa si no lo detectamos."],
    notas: [
      {
        capa: 2,
        lugar: "arriba",
        titulo: "Límites",
        cuerpo: () => (
          <Lista
            items={[
              <>Test tiene pocos peligrosos ({confB.umbral_f2.fn + confB.umbral_f2.vp} y {evalJ.B_sin_MOID.test.positivos}): 1 o 2 detecciones mueven el recall.</>,
              <>Las órbitas recién descubiertas son provisionales: sus etiquetas pueden cambiar.</>,
            ]}
          />
        ),
      },
    ],
  },
};
