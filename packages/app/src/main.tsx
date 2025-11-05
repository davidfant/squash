import { Toaster } from "@/components/ui/sonner";
import {
  ClerkLoaded,
  ClerkProvider,
  SignedIn,
  SignedOut,
  useAuth,
} from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import i18n from "i18next";
import { PostHogProvider } from "posthog-js/react";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { initReactI18next } from "react-i18next";
import { BrowserRouter, Route, Routes } from "react-router";
import { PosthogIdentify } from "./auth/posthog";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import "./index.css";
import resources from "./locales/default";
import { RequireAuthGuard } from "./routes/auth/guard";
import { BranchesPage } from "./routes/branches";
import { BranchPage } from "./routes/branches/details";
import { NewPage } from "./routes/new";
import { ReposPage } from "./routes/repos";

i18n.use(initReactI18next).init({
  lng: "default",
  ns: Object.keys(resources),
  defaultNS: "common",
  resources: { default: resources },
});

const queryClient = new QueryClient();

const IndexPage = () => (
  <ClerkLoaded>
    <SignedIn>
      <BranchesPage />
    </SignedIn>
    <SignedOut>
      <NewPage />
    </SignedOut>
  </ClerkLoaded>
);

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error(
    "Missing Clerk publishable key. Set VITE_CLERK_PUBLISHABLE_KEY."
  );
}

function ClearCacheOnOrganizationChange() {
  const queryClient = useQueryClient();
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoaded) return;

    queryClient.cancelQueries();
    queryClient.invalidateQueries();
  }, [auth.orgId]);

  return null;
}

export const Content = () => {
  const { theme } = useTheme();
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      afterSignOutUrl="/"
      appearance={{ theme: theme === "dark" ? dark : undefined }}
    >
      <PostHogProvider
        apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
        options={{
          api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
          defaults: "2025-05-24",
          capture_exceptions: true,
          debug: import.meta.env.MODE === "development",
        }}
      >
        <PosthogIdentify />

        <QueryClientProvider client={queryClient}>
          <ClearCacheOnOrganizationChange />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<IndexPage />} />
              <Route path="/new" element={<NewPage />} />

              <Route path="/templates" element={<ReposPage />} />
              <Route path="/templates/:repoId" element={<ReposPage />} />
              <Route element={<RequireAuthGuard />}>
                <Route path="/apps" element={<BranchesPage />} />
                <Route path="/apps/:branchId" element={<BranchPage />} />
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
      </PostHogProvider>
    </ClerkProvider>
  );
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <Content />
    </ThemeProvider>
  </StrictMode>
);
