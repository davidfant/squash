import { useChat } from "@/components/layout/chat/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MonitorSmartphone, RotateCw, Smartphone, Tablet } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getNextScreenSize, useBranchContext } from "../context";

export function PreviewAddressBar() {
  const { t } = useTranslation("branch");
  const { previewPath, setPreviewPath, screenSize, setScreenSize, branch } =
    useBranchContext();
  const { sendMessage } = useChat();
  const [inputValue, setInputValue] = useState(previewPath || "/");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setPreviewPath(inputValue);
      (e.currentTarget as HTMLInputElement).blur();
    } else if (e.key === "Escape") {
      setInputValue(previewPath || "/");
      (e.currentTarget as HTMLInputElement).blur();
    }
  };

  const screenSizeIcons = {
    mobile: <Smartphone />,
    tablet: <Tablet />,
    desktop: <MonitorSmartphone />,
  };

  const nextScreenSize = getNextScreenSize(screenSize);
  const nextScreenSizeLabel = t(`addressBar.screen.size.${nextScreenSize}`);

  return (
    <div className="flex items-center flex-1 border rounded-md bg-background max-w-64">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-none h-8 px-3"
            onClick={() => setScreenSize(getNextScreenSize(screenSize))}
          >
            {screenSizeIcons[screenSize]}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {t("addressBar.screen.showPreview", { size: nextScreenSizeLabel })}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Input
            placeholder={t("addressBar.path.placeholder")}
            className="flex-1 border-none shadow-none cursor-pointer"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => setPreviewPath(inputValue)}
          />
        </TooltipTrigger>
        <TooltipContent>{t("addressBar.path.tooltip")}</TooltipContent>
      </Tooltip>

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
    </div>
  );
}
