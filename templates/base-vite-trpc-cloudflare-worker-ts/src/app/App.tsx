import { RouteIcon } from "lucide-react";
import { ComponentType } from "react";
import { Route, Routes } from "react-router";
import { AppSidebar } from "./components/blocks/app-sidebar";
import { SidebarProvider } from "./components/ui/sidebar";
import { MyWorkflowPage } from "./pages/workflow/layout";

const pages: Array<{
  path: string;
  title: string;
  icon: ComponentType;
  component: ComponentType;
}> = [
  {
    path: "/",
    title: "My Workflow",
    icon: RouteIcon,
    component: MyWorkflowPage,
  },
];

export function App() {
  return (
    <SidebarProvider>
      <AppSidebar items={pages} />
      <main className="w-full h-screen">
        <Routes>
          {pages.map((p) => (
            <Route key={p.path} path={p.path} element={<p.component />} />
          ))}
        </Routes>
      </main>
    </SidebarProvider>
  );
}
