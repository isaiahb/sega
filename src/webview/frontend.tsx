/**
 * Frontend Entry Point
 *
 * Mounts the React app with MentraAuth provider.
 */

import { createRoot } from "react-dom/client";
import { MentraAuthProvider } from "@mentra/react";
import { App } from "./App";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

const root = createRoot(container);

root.render(
  <MentraAuthProvider>
    <App />
  </MentraAuthProvider>
);
