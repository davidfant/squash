import { api, useMutation, useQuery } from "@/hooks/api";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useState, type ReactNode } from "react";
import type { Project } from "./types";

export type ScreenSize = "desktop" | "tablet" | "mobile";

export interface ProjectContextValue {
  project: Project;
  devServer: {
    ephemeralUrl: string;
    codeServerUrl: string;
  } | null;
  selectedPageId: string | null;
  screenSize: ScreenSize;
  selectVariant: (
    pageId: string,
    sectionId: string,
    variantId: string
  ) => Promise<unknown>;
  selectPage: (pageId: string) => void;
  setScreenSize: (size: ScreenSize) => void;
  toggleScreenSize: () => void;
}

const ProjectContext = createContext<ProjectContextValue>({
  project: null as any,
  devServer: null,
  selectedPageId: null,
  screenSize: "desktop",
  selectVariant: () => Promise.resolve(),
  selectPage: () => {},
  setScreenSize: () => {},
  toggleScreenSize: () => {},
});

export const ProjectContextProvider = ({
  projectId,
  selectedPageId,
  children,
  onSelectPage,
}: {
  projectId: string;
  selectedPageId: string | null;
  children: ReactNode;
  onSelectPage: (pageId: string) => void;
}) => {
  const project = useQuery(api.projects[":projectId"].$get, {
    params: { projectId },
  });
  const devServer = useQuery(api.projects[":projectId"]["dev-server"].$get, {
    params: { projectId },
  });
  const [screenSize, setScreenSize] = useState<ScreenSize>("desktop");

  // const addSection = (pageId: string, section: ProjectSection) =>
  //   setPages((prev) =>
  //     prev.map((page) =>
  //       page.id === pageId
  //         ? { ...page, sections: [...page.sections, section] }
  //         : page
  //     )
  //   );

  const queryClient = useQueryClient();
  // const updatePage = useMutation(
  //   api.projects[":projectId"].pages[":pageId"].$put,
  //   { onSuccess: () => project.refetch() }
  // );
  const updateSection = useMutation(
    api.projects[":projectId"].pages[":pageId"].sections[":sectionId"].$put
  );
  const selectVariant = async (
    pageId: string,
    sectionId: string,
    variantId: string
  ) => {
    await updateSection.mutateAsync({
      param: { projectId, pageId, sectionId },
      json: { variantId },
    });
    await project.refetch();
  };
  // setPages((prev) =>
  //   prev.map((p) =>
  //     p.id === pageId
  //       ? {
  //           ...p,
  //           sections: p.sections.map((s) =>
  //             s.id === sectionId
  //               ? {
  //                   ...s,
  //                   variants: s.variants.map((v) => ({
  //                     ...v,
  //                     selected: v.id === variantId,
  //                   })),
  //                 }
  //               : s
  //           ),
  //         }
  //       : p
  //   )
  // );

  const toggleScreenSize = () =>
    setScreenSize((current) => {
      const order = ["desktop", "tablet", "mobile"] as const;
      return order[(order.indexOf(current) + 1) % order.length]!;
    });

  if (!project.data) return null;
  return (
    <ProjectContext.Provider
      value={{
        project: project.data,
        devServer: devServer.data ?? null,
        selectedPageId:
          selectedPageId ?? project.data.metadata.pages[0]?.id ?? null,
        screenSize,
        selectVariant,
        selectPage: onSelectPage,
        setScreenSize,
        toggleScreenSize,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = () => useContext(ProjectContext);
export function usePage(pageId: string) {
  const { project } = useProjectContext();
  const page = project.metadata.pages.find((p) => p.id === pageId);
  if (!page) throw new Error("Page not found");
  return page;
}

export function useSelectedPage() {
  const { selectedPageId, project } = useProjectContext();
  return project.metadata.pages.find((p) => p.id === selectedPageId);
}

export function usePageSections(pageId: string) {
  const { project } = useProjectContext();
  const page = project.metadata.pages.find((p) => p.id === pageId);
  if (!page) throw new Error("Page not found");
  return page.sectionIds.map((sectionId) => {
    const section = project.metadata.sections.find((s) => s.id === sectionId);
    if (!section) throw new Error("Section not found");
    return section;
  });
}
