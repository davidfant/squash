import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { ChevronDown, Plus } from "lucide-react";
import { useProjectContext, type ProjectPage } from "./context";

export function ProjectPageSidebar({ page }: { page: ProjectPage }) {
  const { pages } = useProjectContext();

  const handleAddPage = () => {
    // TODO: Implement add page functionality
    console.log("Add page clicked");
  };

  const handleAddVariant = (sectionId: string) => {
    // TODO: Implement add variant functionality
    console.log("Add variant clicked for section:", sectionId);
  };

  return (
    <Sidebar collapsible="none">
      <SidebarHeader>
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
                  <DropdownMenuItem key={pageItem.id}>
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
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
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
                          <SidebarMenuSubButton>
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
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
