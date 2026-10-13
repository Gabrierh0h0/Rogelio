import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
// la presentación (con todo el 3D) se carga solo si se va a usar
const App = lazy(() => import("./App"));
import { Portal } from "./ui/Portal";
import { MODO } from "./presentacion/diapositivas";

// En / se elige entre la expo y el proyecto completo; en /expo y /proyecto va la presentación.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {MODO === "portal" ? (
      <Portal />
    ) : (
      <Suspense fallback={null}>
        <App />
      </Suspense>
    )}
  </StrictMode>,
);
