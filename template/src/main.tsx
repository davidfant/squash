import { Toaster } from "@/components/ui/sonner";
import { addInlineCommentSettingsListener } from "dev-server-utils/inlineComments";
import { postMessage } from "dev-server-utils/messaging";
import i18n from "i18next";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { initReactI18next } from "react-i18next";
import {
  BrowserRouter,
  matchPath,
  useLocation,
  useRoutes,
  type PathMatch,
} from "react-router";
import resources from "./locales/en";
import "./styles/index.css";

addInlineCommentSettingsListener();

i18n.use(initReactI18next).init({
  lng: "en",
  ns: Object.keys(resources),
  defaultNS: "common",
  resources: { en: resources },
});

// Extract routes configuration so we can reuse it for pattern matching
const routes = Object.entries(
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
}));

function RouteChangeAlert() {
  const location = useLocation();
  useEffect(() => {
    let match: PathMatch<string> | null = null;
    for (const route of routes) {
      match = matchPath({ path: route.path }, location.pathname);
      if (!!match) break;
    }

    if (match) {
      postMessage({
        type: "Navigate",
        path: match.pathname,
        pathname: location.pathname,
        params: match.params,
      });
    }
  }, [location.pathname]);
  return null;
}

const AppRoutes = () => useRoutes(routes);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <RouteChangeAlert />
      <AppRoutes />
      <Toaster />
    </BrowserRouter>
  </StrictMode>
);
