import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type {
  ProjectPage,
  ProjectSectionVariant,
} from "dev-server-utils/metadata";
import { ChevronDown, Layers, Loader2, Plus, Settings } from "lucide-react";
import { useState } from "react";
import { usePageSections, useProjectContext } from "./context";

function SectionVariantMenuItem({
  variant,
  pageId,
  sectionId,
}: {
  variant: ProjectSectionVariant;
  pageId: string;
  sectionId: string;
}) {
  const { selectVariant } = useProjectContext();
  const [loading, setLoading] = useState(false);
  const handleSelect = async () => {
    setLoading(true);
    await selectVariant(pageId, sectionId, variant.id);
    setLoading(false);
  };
  return (
    <SidebarMenuSubItem key={variant.id}>
      <SidebarMenuSubButton
        isActive={variant.selected}
        className={cn(
          "cursor-pointer",
          variant.selected && "bg-sidebar-accent"
        )}
        onClick={handleSelect}
      >
        {variant.name}{" "}
        {loading && <Loader2 className="opacity-30 animate-spin" />}
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

export function ProjectPageSidebar({ page }: { page: ProjectPage }) {
  const { selectVariant } = useProjectContext();
  const sections = usePageSections(page.id);

  const handleAddVariant = (sectionId: string) => {
    // TODO: Implement add variant functionality
    alert("Add variant clicked for section: " + sectionId);
  };

  const handleSEOClick = () => {
    // TODO: Implement SEO functionality
    alert("SEO clicked");
  };

  return (
    <Sidebar collapsible="none">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <Layers className="mr-2 h-4 w-4" />
            Sections
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sections.map((section) => (
                <Collapsible key={section.id} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="w-full">
                        <span>{section.name}</span>
                        <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {section.variants.map((variant) => (
                          <SectionVariantMenuItem
                            key={variant.id}
                            variant={variant}
                            pageId={page.id}
                            sectionId={section.id}
                          />
                        ))}
                        <SidebarMenuSubItem>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 px-2"
                            onClick={() => handleAddVariant(section.id)}
                          >
                            <Plus className="mr-2 h-3 w-3" />
                            Add Variant
                          </Button>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="cursor-pointer"
                  onClick={handleSEOClick}
                >
                  SEO
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
