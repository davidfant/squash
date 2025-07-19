import { createContext, useContext, useState } from "react";
import { v4 as uuid } from "uuid";

export interface ProjectSectionVariant {
  id: string;
  label: string;
  selected: boolean;
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

export type ScreenSize = "desktop" | "tablet" | "mobile";

export interface ProjectContextValue {
  pages: ProjectPage[];
  selectedPage: ProjectPage | undefined;
  screenSize: ScreenSize;
  addPage: (page: ProjectPage) => void;
  addSection: (pageId: string, section: ProjectSection) => void;
  selectVariant: (pageId: string, sectionId: string, variantId: string) => void;
  selectPage: (pageId: string) => void;
  setScreenSize: (size: ScreenSize) => void;
  toggleScreenSize: () => void;
}

const ProjectContext = createContext<ProjectContextValue>({
  pages: [],
  selectedPage: undefined,
  screenSize: "desktop",
  addPage: () => Promise.resolve(""),
  addSection: () => {},
  selectVariant: () => {},
  selectPage: () => {},
  setScreenSize: () => {},
  toggleScreenSize: () => {},
});

export const ProjectContextProvider = ({
  children,
  selectedPageId,
  onSelectPage,
}: {
  children: React.ReactNode;
  selectedPageId: string | undefined;
  onSelectPage: (pageId: string) => void;
}) => {
  const [pages, setPages] = useState<ProjectPage[]>([
    {
      id: uuid(),
      label: "Home",
      path: "/",
      sections: [
        {
          id: "hero",
          label: "Hero",
          variants: [
            { id: "hero-1", label: "Hero 1", selected: true },
            { id: "hero-2", label: "Hero 2", selected: false },
            { id: "hero-3", label: "Hero 3", selected: false },
          ],
        },
      ],
    },
  ]);

  const [screenSize, setScreenSize] = useState<ScreenSize>("desktop");

  const selectedPage = pages.find((p) => p.id === selectedPageId) || pages[0];

  const addPage = (page: ProjectPage) => setPages((prev) => [...prev, page]);
  const addSection = (pageId: string, section: ProjectSection) =>
    setPages((prev) =>
      prev.map((page) =>
        page.id === pageId
          ? { ...page, sections: [...page.sections, section] }
          : page
      )
    );

  const selectVariant = (
    pageId: string,
    sectionId: string,
    variantId: string
  ) =>
    setPages((prev) =>
      prev.map((p) =>
        p.id === pageId
          ? {
              ...p,
              sections: p.sections.map((s) =>
                s.id === sectionId
                  ? {
                      ...s,
                      variants: s.variants.map((v) => ({
                        ...v,
                        selected: v.id === variantId,
                      })),
                    }
                  : s
              ),
            }
          : p
      )
    );

  const toggleScreenSize = () => {
    setScreenSize((current) => {
      switch (current) {
        case "desktop":
          return "tablet";
        case "tablet":
          return "mobile";
        case "mobile":
          return "desktop";
        default:
          return "desktop";
      }
    });
  };

  return (
    <ProjectContext.Provider
      value={{
        pages,
        selectedPage,
        screenSize,
        addPage,
        addSection,
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
