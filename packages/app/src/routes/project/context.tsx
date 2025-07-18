import { createContext, useContext, useState } from "react";

export interface ProjectSectionVariant {
  id: string;
  label: string;
}

export interface ProjectSection {
  id: string;
  label: string;
  variants: ProjectSectionVariant[];
}

export interface ProjectPage {
  id: string;
  label: string;
  path: string;
  sections: ProjectSection[];
}

export interface ProjectContextValue {
  pages: ProjectPage[];
  addPage: (page: ProjectPage) => void;
  addSection: (pageId: string, section: ProjectSection) => void;
}

const ProjectContext = createContext<ProjectContextValue>({
  pages: [],
  addPage: () => {},
  addSection: () => {},
});

export const ProjectContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [pages, setPages] = useState<ProjectPage[]>([
    {
      id: "",
      label: "Home",
      path: "/",
      sections: [
        {
          id: "hero",
          label: "Hero",
          variants: [
            { id: "hero-1", label: "Hero 1" },
            { id: "hero-2", label: "Hero 2" },
            { id: "hero-3", label: "Hero 3" },
          ],
        },
      ],
    },
  ]);

  const addPage = (page: ProjectPage) => setPages((prev) => [...prev, page]);
  const addSection = (pageId: string, section: ProjectSection) =>
    setPages((prev) =>
      prev.map((page) =>
        page.id === pageId
          ? { ...page, sections: [...page.sections, section] }
          : page
      )
    );

  return (
    <ProjectContext.Provider value={{ pages, addPage, addSection }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = () => useContext(ProjectContext);
