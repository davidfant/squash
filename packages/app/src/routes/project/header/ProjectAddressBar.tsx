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
import { sseStream } from "@/lib/sseStream";
import { cn } from "@/lib/utils";
import {
  MonitorSmartphone,
  Plus,
  RotateCw,
  Smartphone,
  Tablet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { v4 as uuid } from "uuid";
import {
  useProjectContext,
  useSelectedPage,
  type ScreenSize,
} from "../context";

export function ProjectAddressBar() {
  const { t } = useTranslation("project");
  const selectedPage = useSelectedPage();
  const { project, selectPage, toggleScreenSize, screenSize } =
    useProjectContext();

  const handleAddPage = () => {
    const message = prompt("What do u want on ur page?");
    if (!message) return;

    sseStream({
      endpoint: `projects/${project.id}/chat/page`,
      message: {
        id: uuid(),
        content: [{ type: "text", text: message }],
      },
      onEvent: (chunk) => {
        console.log(chunk);
      },
    });
    // const page: ProjectPage = {
    //   id: uuid(),
    //   label: "New Page",
    //   path: "/new-page",
    //   sections: [],
    // };
    // selectPage(page.id);
  };

  const screenSizeIcons = {
    mobile: <Smartphone />,
    tablet: <Tablet />,
    desktop: <MonitorSmartphone />,
  };

  const getNextScreenSize = (current: ScreenSize): ScreenSize => {
    const order = ["desktop", "tablet", "mobile"] as const;
    return order[(order.indexOf(current) + 1) % order.length]!;
  };

  const nextScreenSize = getNextScreenSize(screenSize);
  const nextScreenSizeLabel = t(`addressBar.screen.size.${nextScreenSize}`);

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
        <TooltipContent>
          {t("addressBar.screen.showPreview", { size: nextScreenSizeLabel })}
        </TooltipContent>
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
            <TooltipContent>{t("addressBar.changePage")}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="center" className="w-64">
            {project.metadata.pages.map((page) => (
              <DropdownMenuItem
                key={page.id}
                onClick={() => selectPage(page.id)}
                className={cn(selectedPage?.id === page.id && "bg-accent")}
              >
                {page.name}
                <Badge variant="outline">{page.path}</Badge>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={handleAddPage}>
              <Plus />
              {t("addressBar.addPage")}
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
        <TooltipContent>{t("addressBar.refresh")}</TooltipContent>
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
