/*
 * Los efectos de la cinemática están ocultos hasta el choque, y three.js solo compila los
 * shaders de lo visible: sin esto, la primera vez el cuadro del impacto se congela un par de
 * segundos mientras compila. Aquí se muestran un instante, se compilan y se vuelven a ocultar.
 */
import { useEffect, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import type * as THREE from "three";

export function usePrecompilar(raiz: RefObject<THREE.Object3D | null>) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const r = raiz.current;
    if (!r) return;
    const ocultos: THREE.Object3D[] = [];
    r.traverse((o) => {
      if (!o.visible) {
        ocultos.push(o);
        o.visible = true;
      }
    });
    gl.compile(scene, camera);
    for (const o of ocultos) o.visible = false;
  }, [gl, scene, camera, raiz]);
}
