import { ChatThread } from "@/components/layout/chat/ChatThread";
import { ChatProvider } from "@/components/layout/chat/context";
import { SidebarProvider } from "@/components/ui/sidebar";
import { v4 as uuid } from "uuid";
import { ProjectContextProvider, useProjectContext } from "./context";
import { ProjectCanvas } from "./ProjectCanvas";
import { ProjectPageSidebar } from "./ProjectPageSidebar";

function Component() {
  const { pages } = useProjectContext();
  return (
    <SidebarProvider>
      <ChatThread className="p-2" />
      <div>
        <ProjectPageSidebar page={pages[0]!} />
      </div>
      <main className="flex-1">
        <ProjectCanvas />
      </main>
    </SidebarProvider>
  );
}

export function ProjectPage() {
  return (
    <ChatProvider
      endpoint="/todo"
      initialMessages={[
        {
          id: uuid(),
          role: "user",
          content: [
            {
              type: "text",
              text: "I wanna build a LP!!!",
            },
            {
              type: "image",
              image: new URL(
                "https://media.istockphoto.com/id/2181735944/photo/natural-mountains-landscapes.jpg?s=612x612&w=0&k=20&c=4EZdF1438jegkW3U8h0TG4JaPO_cpMMBY-MouwLlyf4="
              ),
            },
          ],
        },
      ]}
    >
      <ProjectContextProvider>
        <Component />
      </ProjectContextProvider>
    </ChatProvider>
  );
}
