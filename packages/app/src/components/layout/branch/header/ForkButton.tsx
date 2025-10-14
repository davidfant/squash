import { SandboxTaskStream } from "@/components/blocks/SandboxTaskStream";
import { FeatureCardEditTitleDialog } from "@/components/blocks/feature/edit-title-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChat } from "@ai-sdk/react";
import type { SandboxTaskMessage } from "@squashai/api/agent/types";
import { DefaultChatTransport } from "ai";
import { MoreVertical } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBranchContext } from "../context";

export function ForkButton() {
  const { t } = useTranslation("branch");
  const { branch } = useBranchContext();

  const stream = useChat<SandboxTaskMessage>({
    messages: [],
    transport: new DefaultChatTransport({
      api: `${import.meta.env.VITE_API_URL}/branches/${branch.id}/fork`,
      credentials: "include",
    }),
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleFork = useCallback(
    async (name: string) => {
      stream.setMessages([]);
      await stream.sendMessage(undefined, {
        body: { name },
      });
    },
    [stream.sendMessage, stream.setMessages]
  );

  const forking = ["submitted", "streaming"].includes(stream.status);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-96 p-4 space-y-4">
          <div>
            <h3 className="font-medium">{t("fork.dialog.title")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("fork.dialog.description")}
            </p>
          </div>

          <Button
            className="w-full"
            disabled={forking}
            loading={forking}
            onClick={() => setIsDialogOpen(true)}
          >
            {forking ? t("fork.dialog.forking") : t("fork.dialog.fork")}
          </Button>
          <SandboxTaskStream stream={stream} />
        </DropdownMenuContent>
      </DropdownMenu>
      <FeatureCardEditTitleDialog
        title={branch.title}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onEdit={(value) => handleFork(value.trim())}
        dialogTitle={t("fork.dialog.title")}
        submitLabel={t("fork.dialog.fork")}
        allowUnchanged
      />
    </>
  );
}
