/*
 * Mismo formato que los notebooks: miles con coma y decimales con punto
 * (4,687 · 99.55% · 0.905), para que las cifras se lean igual en ambos lados.
 */
const entero = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export const fmt = {
  entero: (n: number) => entero.format(n),
  decimal: (n: number, digitos = 3) => n.toFixed(digitos),
  porcentaje: (fraccion: number, digitos = 1) => `${(fraccion * 100).toFixed(digitos)}%`,
};
