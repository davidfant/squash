import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../themes/base/semantic.css";
import { App } from "./App";
import "./index.css";
import { ThemeProvider } from "./themeEditor/context";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);
