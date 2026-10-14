/*
 * Lee un .ipynb (copiado a public/notebooks por `npm run sincronizar`) y lo deja listo para el visor:
 * markdown a HTML con fórmulas KaTeX, código Python coloreado y las salidas tal como quedaron al
 * ejecutar el notebook (texto, tablas de pandas, gráficas). No recalcula nada.
 */
import { Marked } from "marked";
import katex from "katex";
import hljs from "highlight.js/lib/core";
import python from "highlight.js/lib/languages/python";
import { NOTEBOOKS, type CualNotebook } from "./secciones";

hljs.registerLanguage("python", python);

type Texto = string | string[];
type SalidaCruda =
  | { output_type: "stream"; name: string; text: Texto }
  | { output_type: "display_data" | "execute_result"; data: Record<string, Texto> }
  | { output_type: "error"; ename: string; evalue: string; traceback: string[] };
type CeldaCruda = {
  cell_type: "markdown" | "code" | "raw";
  source: Texto;
  outputs?: SalidaCruda[];
  execution_count?: number | null;
};

export type SalidaVista =
  | { tipo: "texto"; texto: string }
  | { tipo: "imagen"; src: string }
  | { tipo: "html"; html: string }
  | { tipo: "error"; texto: string };

export type CeldaVista =
  | { tipo: "markdown"; html: string }
  | { tipo: "codigo"; n: number | null; html: string; salidas: SalidaVista[] };

export type Seccion = { id: string; nivel: 2 | 3; titulo: string };
export type NotebookVista = { celdas: CeldaVista[]; secciones: Seccion[] };

const unir = (t: Texto) => (Array.isArray(t) ? t.join("") : t);
const sinAnsi = (t: string) => t.replace(/\x1b\[[0-9;]*m/g, "");
const marked = new Marked({ gfm: true });

/** Markdown con $…$ y $$…$$: las fórmulas se guardan aparte (fuera del código) y se ponen ya en KaTeX. */
function markdownConFormulas(fuente: string): string {
  const formulas: string[] = [];
  const guardar = (tex: string, enBloque: boolean) => {
    formulas.push(katex.renderToString(tex.trim(), { displayMode: enBloque, throwOnError: false }));
    return `%%FORMULA${formulas.length - 1}%%`;
  };
  // los trozos impares son código (```bloques``` o `en línea`): ahí un $ es solo un $
  const trozos = fuente.split(/(```[\s\S]*?```|`[^`\n]*`)/);
  const preparado = trozos
    .map((t, i) =>
      i % 2
        ? t
        : t.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex: string) => guardar(tex, true)).replace(/\$([^$\n]+?)\$/g, (_, tex: string) => guardar(tex, false)),
    )
    .join("");
  const html = marked.parse(preparado, { async: false });
  return html.replace(/%%FORMULA(\d+)%%/g, (_, k: string) => formulas[Number(k)]);
}

/** Títulos con ancla (<a id="…"></a> justo antes de un ## o ###): son el índice lateral. */
function seccionesDe(fuente: string): Seccion[] {
  const out: Seccion[] = [];
  let ancla: string | null = null;
  for (const linea of fuente.split("\n")) {
    const a = linea.match(/<a id="([^"]+)"><\/a>/);
    if (a) {
      ancla = a[1];
      continue;
    }
    const h = linea.match(/^(#{2,3})\s+(.+)$/);
    if (h && ancla) {
      out.push({ id: ancla, nivel: h[1].length as 2 | 3, titulo: h[2].replace(/[`*$]/g, "").trim() });
      ancla = null;
    } else if (linea.trim()) ancla = null;
  }
  return out;
}

function salidasDe(lista: SalidaCruda[] = []): SalidaVista[] {
  const out: SalidaVista[] = [];
  for (const s of lista) {
    if (s.output_type === "stream") {
      if (s.name === "stderr") continue; // avisos de librerías: no son resultados
      const previa = out[out.length - 1];
      if (previa?.tipo === "texto") previa.texto += unir(s.text);
      else out.push({ tipo: "texto", texto: unir(s.text) });
    } else if (s.output_type === "error") {
      out.push({ tipo: "error", texto: sinAnsi(s.traceback.join("\n")) });
    } else {
      const d = s.data;
      if (d["image/png"]) out.push({ tipo: "imagen", src: `data:image/png;base64,${unir(d["image/png"]).replace(/\s/g, "")}` });
      else if (d["image/jpeg"]) out.push({ tipo: "imagen", src: `data:image/jpeg;base64,${unir(d["image/jpeg"]).replace(/\s/g, "")}` });
      else if (d["text/html"])
        out.push({ tipo: "html", html: unir(d["text/html"]).replace(/<(style|script)[\s\S]*?<\/\1>/gi, "") });
      else if (d["image/svg+xml"]) out.push({ tipo: "html", html: unir(d["image/svg+xml"]) });
      else if (d["text/plain"]) out.push({ tipo: "texto", texto: unir(d["text/plain"]) });
    }
  }
  return out;
}

function procesar(nb: { cells: CeldaCruda[] }): NotebookVista {
  const celdas: CeldaVista[] = [];
  const secciones: Seccion[] = [];
  for (const c of nb.cells) {
    const fuente = unir(c.source);
    if (c.cell_type === "markdown") {
      celdas.push({ tipo: "markdown", html: markdownConFormulas(fuente) });
      secciones.push(...seccionesDe(fuente));
    } else if (c.cell_type === "code") {
      celdas.push({
        tipo: "codigo",
        n: c.execution_count ?? null,
        html: hljs.highlight(fuente, { language: "python" }).value,
        salidas: salidasDe(c.outputs),
      });
    }
  }
  return { celdas, secciones };
}

const cache = new Map<CualNotebook, Promise<NotebookVista>>();

/** Descarga y prepara un notebook una sola vez (si falla, se puede volver a intentar). */
export function cargarNotebook(cual: CualNotebook): Promise<NotebookVista> {
  let p = cache.get(cual);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}notebooks/${NOTEBOOKS[cual].archivo}`)
      .then((r) => {
        if (!r.ok) throw new Error(`No se pudo leer ${NOTEBOOKS[cual].archivo} (${r.status})`);
        return r.json();
      })
      .then(procesar);
    p.catch(() => cache.delete(cual));
    cache.set(cual, p);
  }
  return p;
}
