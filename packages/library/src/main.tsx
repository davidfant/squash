import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { ComponentsProvider } from "./context";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ComponentsProvider>
      <App />
    </ComponentsProvider>
  </StrictMode>
);
