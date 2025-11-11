import { PostHogProvider } from "posthog-js/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { Layout } from "./components/blocks/layout";
import "./index.css";
import { initMetaPixel } from "./lib/meta";

initMetaPixel(import.meta.env.VITE_META_PIXEL_ID);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
      options={{
        api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
        defaults: "2025-05-24",
        capture_exceptions: true,
        debug: import.meta.env.MODE === "development",
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/:slug" element={<Layout />} />

          <Route
            path="*"
            element={
              <div className="flex flex-col items-center justify-center h-screen">
                <h1>404 – Page Not Found</h1>
                <p>The page you are looking for doesn’t exist.</p>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </PostHogProvider>
  </StrictMode>
);
