import { SandboxTaskStream } from "@/components/blocks/SandboxTaskStream";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { api, useMutation, useQuery } from "@/hooks/api";
import { useChat } from "@ai-sdk/react";
import type { SandboxTaskMessage } from "@squashai/api/agent/types";
import { DefaultChatTransport } from "ai";
import { ExternalLink, Share } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBranchContext } from "../context";

export function ShareButton() {
  const { t } = useTranslation("branch");
  const { branch, previewSha, refetch } = useBranchContext();

  const stream = useChat<SandboxTaskMessage>({
    messages: [],
    transport: new DefaultChatTransport({
      api: `${import.meta.env.VITE_API_URL}/branches/${branch.id}/deploy`,
      credentials: "include",
    }),
    onFinish: async () => {
      await refetch();
      stream.setMessages([]);
    },
  });

  const unpublish = useMutation(api.branches[":branchId"].deploy.$delete, {
    onSuccess: () => refetch(),
  });

  const handlePublish = useCallback(() => {
    stream.setMessages([]);
    stream.sendMessage();
  }, [stream.sendMessage, stream.setMessages]);

  const isDeploymentOutdated =
    !!branch.deployment && previewSha && previewSha !== branch.deployment?.sha;
  const publishing = ["submitted", "streaming"].includes(stream.status);

  return (
    <DropdownMenu
    // onOpenChange={(open) => {
    //   if (open && !branch.deployment) {
    //     handlePublish();
    //   }
    // }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="default" size="sm">
          <Share />
          {t("share.button")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-4 space-y-4">
        <div>
          <h3 className="font-medium">{t("share.dialog.title")}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("share.dialog.description")}
          </p>
        </div>

        {!!branch.deployment && (
          <div>
            <div className="space-y-2">
              <Label>
                Prototype URL <Badge variant="green">Live</Badge>
              </Label>
              <a target="_blank" href={branch.deployment.url}>
                <div className="border rounded-md text-sm flex items-center gap-2 w-full bg-transparent truncate px-2 py-2 text-muted-foreground hover:bg-accent transition-colors">
                  <span className="flex-1 truncate">
                    {branch.deployment.url}
                  </span>
                  <ExternalLink className="size-4" />
                </div>
              </a>
            </div>
            <Button
              variant="ghost"
              className="w-full"
              disabled={unpublish.isPending}
              loading={unpublish.isPending}
              onClick={() =>
                unpublish.mutateAsync({ param: { branchId: branch.id } })
              }
            >
              {unpublish.isPending
                ? t("share.dialog.unpublishing")
                : t("share.dialog.unpublish")}
            </Button>
          </div>
        )}

        {(!branch.deployment || isDeploymentOutdated) && (
          <Button
            className="w-full"
            disabled={publishing}
            loading={publishing}
            onClick={handlePublish}
          >
            {publishing
              ? t("share.dialog.publishing")
              : t("share.dialog.publish")}
          </Button>
        )}
        {isDeploymentOutdated && (
          <p className="text-sm text-muted-foreground">
            {t("share.dialog.outdatedWarning")}
          </p>
        )}
        <SandboxTaskStream stream={stream} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
