import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  MonitorSmartphone,
  Plus,
  RotateCw,
  Smartphone,
  Tablet,
} from "lucide-react";
import { v4 as uuid } from "uuid";
import {
  useProjectContext,
  type ProjectPage,
  type ScreenSize,
} from "../context";

export function ProjectAddressBar() {
  const {
    pages,
    selectedPage,
    addPage,
    selectPage,
    toggleScreenSize,
    screenSize,
  } = useProjectContext();

  const handleAddPage = () => {
    const page: ProjectPage = {
      id: uuid(),
      label: "New Page",
      path: "/new-page",
      sections: [],
    };
    addPage(page);
    selectPage(page.id);
  };

  const screenSizeIcons = {
    mobile: <Smartphone />,
    tablet: <Tablet />,
    desktop: <MonitorSmartphone />,
  };

  const getNextScreenSize = (current: ScreenSize): ScreenSize => {
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
  };

  const getScreenSizeLabel = (size: ScreenSize): string => {
    switch (size) {
      case "desktop":
        return "Desktop";
      case "tablet":
        return "Tablet";
      case "mobile":
        return "Mobile";
      default:
        return "Desktop";
    }
  };

  const nextScreenSize = getNextScreenSize(screenSize);
  const nextScreenSizeLabel = getScreenSizeLabel(nextScreenSize);

  return (
    <div className="flex items-center flex-1 border rounded-md overflow-hidden bg-background max-w-64">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-none h-8 px-3"
            onClick={toggleScreenSize}
          >
            {screenSizeIcons[screenSize]}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Show {nextScreenSizeLabel} preview</TooltipContent>
      </Tooltip>

      {/* URL Input with Page Selector */}
      <div className="flex-1 relative cursor-pointer">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <p className="w-full text-center">{selectedPage?.path}</p>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Change page</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="center" className="w-64">
            {pages.map((page) => (
              <DropdownMenuItem
                key={page.id}
                onClick={() => selectPage(page.id)}
                className={cn(selectedPage?.id === page.id && "bg-accent")}
              >
                {page.label}
                <Badge variant="outline">{page.path}</Badge>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={handleAddPage}>
              <Plus />
              Add Page
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Refresh - Ghost with single arrow */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => alert("TODO: refresh")}
          >
            <RotateCw />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Refresh</TooltipContent>
      </Tooltip>

      {/* Open in New Tab - Ghost */}
      {/* <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => alert("TODO: open in new tab")}
          >
            <ExternalLink />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Open in New Tab</TooltipContent>
      </Tooltip> */}
    </div>
  );
}
