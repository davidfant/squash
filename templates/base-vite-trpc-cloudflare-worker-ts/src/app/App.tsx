import { InboxIcon, RouteIcon, Table2Icon } from "lucide-react";
import { ComponentType } from "react";
import { Route, Routes } from "react-router";
import { AppSidebar } from "./components/blocks/app-sidebar";
import { SidebarProvider } from "./components/ui/sidebar";
import { DebugPage } from "./pages/debug";
import { MyReviewPage } from "./pages/review/layout";
import { MyTablePage } from "./pages/table/layout";
import { MyWorkflowPage } from "./pages/workflow/layout";

const pages: Array<{
  path: string;
  title: string;
  icon: ComponentType;
  component: ComponentType;
}> = [
  { path: "/", title: "Workflow", icon: RouteIcon, component: MyWorkflowPage },
  { path: "/table", title: "Table", icon: Table2Icon, component: MyTablePage },
  {
    path: "/review",
    title: "Review",
    icon: InboxIcon,
    component: MyReviewPage,
  },
  {
    path: "/debug",
    title: "Debug",
    icon: InboxIcon,
    component: DebugPage,
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
