import { Toaster } from "@/components/ui/sonner";
import { addInlineCommentSettingsListener } from "@lp/dev-tools/inlineComments";
import i18n from "i18next";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initReactI18next } from "react-i18next";
import { BrowserRouter, useRoutes } from "react-router";
import resources from "./locales/en";
import "./styles/index.css";

// enableHighlighting();
addInlineCommentSettingsListener();

i18n.use(initReactI18next).init({
  lng: "en",
  ns: ["common"],
  defaultNS: "common",
  resources: { en: resources },
});

const AppRoutes = () =>
  useRoutes(
    Object.entries(
      import.meta.glob("/src/pages/**/*.tsx", {
        eager: true,
      }) as Record<string, { default: React.ComponentType }>
    ).map(([filePath, module]) => ({
      path:
        filePath
          // Strip the leading directory & file extension
          .replace(/^\/src\/pages/, "")
          .replace(/(\/index)?\.tsx$/i, "")
          // Dynamic params: [id] → :id
          .replace(/\[([^\.\.\]]+)\]/g, ":$1")
          // Catch‑all / splat: [...slug] → *  (must be last!)
          .replace(/\[\.\.\.[^\]]+\]/, "*") || "/",
      element: <module.default />,
    }))
  );

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AppRoutes />
      <Toaster />
    </BrowserRouter>
  </StrictMode>
);
