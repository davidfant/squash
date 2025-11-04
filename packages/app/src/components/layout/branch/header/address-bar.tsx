import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MonitorSmartphone, RotateCw, Smartphone, Tablet } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getNextScreenSize, useBranchContext } from "../context";

export function AddressBar() {
  const { t } = useTranslation("branch");
  const { preview, screenSize, setScreenSize } = useBranchContext();
  const [inputValue, setInputValue] = useState(preview.currentPath);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      preview.setInitialPath(inputValue);
      preview.refresh();
      (e.currentTarget as HTMLInputElement).blur();
    } else if (e.key === "Escape") {
      setInputValue(preview.currentPath);
      (e.currentTarget as HTMLInputElement).blur();
    }
  };
  useEffect(() => setInputValue(preview.currentPath), [preview.currentPath]);

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
            onBlur={() => preview.setInitialPath(inputValue)}
          />
        </TooltipTrigger>
        <TooltipContent>{t("addressBar.path.tooltip")}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={preview.refresh}>
            <RotateCw />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("addressBar.refresh")}</TooltipContent>
      </Tooltip>
    </div>
  );
}
