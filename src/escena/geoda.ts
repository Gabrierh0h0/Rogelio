/*
 * Interior de geoda de plastilina para la cara cortada de cada asteroide.
 * Se dibuja una vez en un canvas: anillos concéntricos un poco chuecos (como rollitos de
 * plastilina aplastados) y un centro de "cristales" en bolitas. Una paleta por variante.
 */
import * as THREE from "three";

const PALETAS = [
  ["#5d6b55", "#b98e63", "#f4b860", "#ffe7a8", "#e8743b", "#6fd3c4"],
  ["#6a6e62", "#c9a46c", "#f2d27a", "#fff1c4", "#d9608a", "#8fb8f0"],
  ["#4f6a4c", "#a3825a", "#e9a65a", "#fbdca0", "#9a6fd1", "#7fd8a8"],
];

function azar(semilla: number) {
  let s = semilla * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function anillo(ctx: CanvasRenderingContext2D, r: number, color: string, rnd: () => number) {
  const fases = [rnd() * 6, rnd() * 6, rnd() * 6];
  ctx.beginPath();
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const ondula =
      1 + 0.05 * Math.sin(a * 3 + fases[0]) + 0.03 * Math.sin(a * 7 + fases[1]) + 0.015 * Math.sin(a * 13 + fases[2]);
    const x = 256 + Math.cos(a) * r * ondula;
    const y = 256 + Math.sin(a) * r * ondula;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function texturaGeoda(variante: number) {
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = 512;
  const ctx = lienzo.getContext("2d")!;
  const paleta = PALETAS[variante % PALETAS.length];
  const rnd = azar(variante + 3);
  // corteza (debajo, se ve en el borde irregular del corte) y anillos hacia adentro
  ctx.fillStyle = paleta[0];
  ctx.fillRect(0, 0, 512, 512);
  const radios = [250, 200, 160, 125, 95];
  radios.forEach((r, i) => anillo(ctx, r, paleta[Math.min(i + 1, paleta.length - 1)], rnd));
  // cristales: bolitas con brillo, como plastilina pellizcada
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * 80;
    const x = 256 + Math.cos(a) * d;
    const y = 256 + Math.sin(a) * d;
    const r = 5 + rnd() * 9;
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.35, paleta[5]);
    g.addColorStop(1, paleta[4]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // grano de plastilina
  const img = ctx.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * 18;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(lienzo);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function materialGeoda(variante: number) {
  return new THREE.MeshStandardMaterial({
    map: texturaGeoda(variante),
    roughness: 0.55,
    metalness: 0,
    emissive: new THREE.Color("#ffb347"),
    emissiveIntensity: 0.12,
  });
}
