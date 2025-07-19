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
import { ChevronDown, Layers, Plus, Settings } from "lucide-react";
import { useProjectContext, type ProjectPage } from "./context";

export function ProjectPageSidebar({ page }: { page: ProjectPage }) {
  const { pages, selectPage, addPage, selectVariant } = useProjectContext();

  const handleAddPage = () => {
    // TODO: Implement add page functionality
    console.log("Add page clicked");
  };

  const handleAddVariant = (sectionId: string) => {
    // TODO: Implement add variant functionality
    console.log("Add variant clicked for section:", sectionId);
  };

  const handleSEOClick = () => {
    // TODO: Implement SEO functionality
    console.log("SEO clicked");
  };

  return (
    <Sidebar collapsible="none">
      {/* <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <span>{page.path}</span>
                  <span className="text-muted-foreground">{page.label}</span>
                  <ChevronDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60">
                {pages.map((pageItem) => (
                  <DropdownMenuItem
                    key={pageItem.id}
                    onClick={() => selectPage(pageItem.id)}
                  >
                    {pageItem.path}
                    <span className="text-muted-foreground">
                      {pageItem.label}
                    </span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={handleAddPage}>
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Add Page</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader> */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <Layers className="mr-2 h-4 w-4" />
            Sections
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {page.sections.map((section) => (
                <Collapsible
                  key={section.id}
                  defaultOpen
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="w-full">
                        <span>{section.label}</span>
                        <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {section.variants.map((variant) => (
                          <SidebarMenuSubItem key={variant.id}>
                            <SidebarMenuSubButton
                              className={cn(
                                "cursor-pointer",
                                variant.selected && "bg-sidebar-accent"
                              )}
                              onClick={() =>
                                selectVariant(page.id, section.id, variant.id)
                              }
                            >
                              {variant.label}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
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
