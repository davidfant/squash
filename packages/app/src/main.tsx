import { Toaster } from "@/components/ui/sonner";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import "./index.css";
import { LandingPage } from "./routes/landing";
import { OnboardingPage } from "./routes/onboarding";
import { ProjectPage } from "./routes/project";
import { ProjectCanvas } from "./routes/project/ProjectCanvas";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/project" element={<ProjectPage />} />
        <Route path="/project/page/:pageId" element={<ProjectPage />} />
        <Route path="/project/x" element={<ProjectCanvas />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
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
  </StrictMode>
);
