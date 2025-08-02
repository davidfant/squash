import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import i18n from "i18next";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initReactI18next } from "react-i18next";
import { BrowserRouter, Route, Routes } from "react-router";
import "./index.css";
import resources from "./locales/default";
import { LandingPage } from "./routes/landing";
import { NewRepoFromProvider, NewRepoPage } from "./routes/new/repo";
import { ProjectPage } from "./routes/project";
import { ThreadPage } from "./routes/thread";

i18n.use(initReactI18next).init({
  lng: "default",
  ns: Object.keys(resources),
  defaultNS: "common",
  resources: { default: resources },
});

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/threads/:threadId" element={<ThreadPage />} />
          <Route path="/projects/:projectId" element={<ProjectPage />} />
          <Route
            path="/projects/:projectId/pages/:pageId"
            element={<ProjectPage />}
          />
          <Route path="/new/repo" element={<NewRepoPage />} />
          <Route
            path="/new/repo/:providerId"
            element={<NewRepoFromProvider />}
          />
          {/* <Route path="/project/page/:pageId" element={<ProjectPage />} />
          <Route path="/project/x" element={<ProjectCanvas />} /> */}
          {/* <Route path="/new/:threadId" element={<ThreadPage />} />
          <Route path="/workflows/:workflowId" element={<WorkflowPage />} />
          <Route path="/invite/:inviteId" element={<InvitePage />} />
          <Route
          path="*"
          element={
            <div style={{ textAlign: "center", padding: "2rem" }}>
            <h1>404 - Page Not Found</h1>
            <p>The page you are looking for doesn't exist.</p>
            <Link to="/">Go back to home</Link>
            </div>
            }
            /> */}
        </Routes>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
