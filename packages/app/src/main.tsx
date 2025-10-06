import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import i18n from "i18next";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initReactI18next } from "react-i18next";
import { BrowserRouter, Route, Routes } from "react-router";
import { ThemeProvider } from "./contexts/ThemeContext";
import "./index.css";
import resources from "./locales/default";
import { RequireAuthGuard } from "./routes/auth/guard";
import { InvitePage } from "./routes/auth/invite";
import { LoginPage } from "./routes/auth/login";
import { BranchesPage } from "./routes/branches";
import { BranchPage } from "./routes/branches/details";
import { NewBranchFromRepoPage } from "./routes/branches/new";
import { ExtensionAuthPage } from "./routes/extension-auth";
import { LandingPage } from "./routes/landing";
import { NewRepoFromProvider, NewRepoPage } from "./routes/new/repo";
import { NewRepoManualPage } from "./routes/new/repo/manual";
import { ReposPage } from "./routes/repos";

i18n.use(initReactI18next).init({
  lng: "default",
  ns: Object.keys(resources),
  defaultNS: "common",
  resources: { default: resources },
});

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/invite/:inviteId" element={<InvitePage />} />
            <Route element={<RequireAuthGuard />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/extension-auth" element={<ExtensionAuthPage />} />
              <Route path="/playgrounds" element={<ReposPage />} />
              <Route path="/playgrounds/:repoId" element={<ReposPage />} />
              <Route
                path="/playgrounds/:repoId/new"
                element={<NewBranchFromRepoPage />}
              />
              <Route path="/prototypes" element={<BranchesPage />} />
              <Route path="/prototypes/:branchId" element={<BranchPage />} />
              <Route path="/new/repo" element={<NewRepoPage />} />
              <Route path="/new/repo/manual" element={<NewRepoManualPage />} />
              <Route
                path="/new/repo/:providerId"
                element={<NewRepoFromProvider />}
              />
            </Route>

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
          <Toaster />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>
);
