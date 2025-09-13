import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, GitCommit } from "lucide-react";
import { useMemo } from "react";
import { useChatContext } from "./context";
import { useMessageLineage } from "./messageLineage";

export function HistoryPanel({
  onClose,
  onSelectCommit,
  className,
  threadId,
}: {
  onClose: () => void;
  onSelectCommit: (sha: string) => void;
  className?: string;
  threadId: string;
}) {
  const { messages } = useChatContext();
  const { activePath, variants, switchVariant } = useMessageLineage(
    messages,
    threadId
  );

  // Extract commits from the active path
  const commitsInPath = useMemo(() => {
    const commits: Array<{
      messageId: string;
      parentId?: string;
      commit: { sha: string; title: string; description: string };
      createdAt?: string;
      variants?: {
        options: Array<{
          messageId: string;
          commit: { sha: string; title: string; description: string };
        }>;
        activeIndex: number;
      };
    }> = [];

    // Build a map to track which commits we've already processed
    const processedCommits = new Set<string>();

    // Go through active path and find messages with git commits
    activePath.forEach((message) => {
      const gitSha = message.parts.find(
        (
          p: any
        ): p is {
          type: "data-GitSha";
          data: { sha: string; title: string; description: string };
        } => p.type === "data-GitSha"
      );

      if (!gitSha || processedCommits.has(message.id)) return;
      processedCommits.add(message.id);

      const parentId = message.metadata?.parentId;

      // Find all siblings (messages with same parent) that have commits
      const siblings = messages.filter(
        (m) =>
          m.metadata?.parentId === parentId &&
          m.parts.some((p) => p.type === "data-GitSha")
      );

      // Also check for commits that share the same grandparent (for root level variants)
      const messageParent = parentId
        ? messages.find((m) => m.id === parentId)
        : null;
      const grandparentId = messageParent?.metadata?.parentId;

      let actualSiblings = siblings;
      if (siblings.length === 1 && grandparentId) {
        // Look for messages whose parent's parent is the same
        const cousins = messages.filter((m) => {
          const mParent = m.metadata?.parentId
            ? messages.find((p) => p.id === m.metadata?.parentId)
            : null;
          return (
            mParent?.metadata?.parentId === grandparentId &&
            m.parts.some((p: any) => p.type === "data-gitSha")
          );
        });

        if (cousins.length > 1) {
          actualSiblings = cousins;
          console.log(
            `Found ${cousins.length} cousins (commits with same grandparent ${grandparentId})`
          );
        }
      }

      let variantInfo: (typeof commits)[0]["variants"] = undefined;

      if (actualSiblings.length > 1) {
        // Extract commits from siblings
        const variantCommits = actualSiblings
          .map((sibling) => {
            const siblingGitSha = sibling.parts.find(
              (p) => p.type === "data-GitSha"
            );

            if (!siblingGitSha) return null;
            return {
              messageId: sibling.id,
              commit: siblingGitSha.data,
            };
          })
          .filter((v): v is NonNullable<typeof v> => v !== null);

        // Sort variants by creation time to maintain consistent order
        variantCommits.sort((a, b) => {
          const aMsg = messages.find((m) => m.id === a.messageId);
          const bMsg = messages.find((m) => m.id === b.messageId);
          const aTime = aMsg?.metadata?.createdAt
            ? new Date(aMsg.metadata.createdAt).getTime()
            : 0;
          const bTime = bMsg?.metadata?.createdAt
            ? new Date(bMsg.metadata.createdAt).getTime()
            : 0;
          return aTime - bTime;
        });

        variantInfo = {
          options: variantCommits,
          activeIndex: variantCommits.findIndex(
            (v) => v.messageId === message.id
          ),
        };
      }

      commits.push({
        messageId: message.id,
        parentId,
        commit: gitSha.data,
        createdAt: message.metadata?.createdAt,
        variants: variantInfo,
      });
    });

    // Reverse to show newest first
    return commits.reverse();
  }, [activePath, messages]);

  // Handle variant selection
  const handleVariantChange = (
    commitParentId: string | undefined,
    variantMessageId: string
  ) => {
    console.log(
      `Switching variant: commitParentId=${commitParentId}, variant=${variantMessageId}`
    );

    // Find the actual parent to switch at
    // If these are "cousin" commits, we need to find their common ancestor
    const variantMessage = messages.find((m) => m.id === variantMessageId);
    const currentMessage = messages.find((m) => m.id === commitParentId);

    if (!variantMessage) return;

    // Check if they share the same parent (siblings)
    if (variantMessage.metadata?.parentId === commitParentId) {
      switchVariant(commitParentId!, variantMessageId);
      return;
    }

    // Check if they're cousins (parent's parent is the same)
    const variantParent = variantMessage.metadata?.parentId
      ? messages.find((m) => m.id === variantMessage.metadata?.parentId)
      : null;
    const currentParent = commitParentId
      ? messages.find((m) => m.id === commitParentId)
      : null;

    if (
      variantParent &&
      currentParent &&
      variantParent.metadata?.parentId === currentParent.metadata?.parentId
    ) {
      // Switch at the parent level
      switchVariant(variantParent.metadata!.parentId, variantParent.id);
    }
  };

  // Helper function to format date
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  return (
    <div
      className={cn("flex flex-col h-full border-r bg-background", className)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="font-semibold text-sm">Version History</h2>
        <span className="text-xs text-muted-foreground ml-auto">
          {commitsInPath.length} commit{commitsInPath.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Commit List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {commitsInPath.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No commits in history yet
            </p>
          ) : (
            <div className="space-y-4">
              {commitsInPath.map((item, index) => {
                const hasVariants =
                  item.variants && item.variants.options.length > 1;

                return (
                  <div key={item.messageId} className="relative">
                    {/* Vertical line between cards */}
                    {index > 0 && (
                      <div className="absolute left-1/2 -translate-x-1/2 -top-4 w-px h-4 bg-gray-300 dark:bg-gray-700" />
                    )}

                    {/* Card */}
                    <div className="bg-card rounded-lg border overflow-hidden">
                      {/* Variant selector header */}
                      {(hasVariants || index === 0) && (
                        <div className="px-4 py-2 bg-muted/30 border-b">
                          <div className="flex items-center justify-between">
                            {hasVariants && item.variants && item.parentId && (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => {
                                    const prevIndex =
                                      (item.variants!.activeIndex -
                                        1 +
                                        item.variants!.options.length) %
                                      item.variants!.options.length;
                                    const prevVariant =
                                      item.variants!.options[prevIndex];
                                    if (prevVariant) {
                                      handleVariantChange(
                                        item.parentId!,
                                        prevVariant.messageId
                                      );
                                    }
                                  }}
                                >
                                  <ChevronLeft className="h-3 w-3" />
                                </Button>
                                <span className="text-xs font-medium text-muted-foreground">
                                  Variant {item.variants.activeIndex + 1} of{" "}
                                  {item.variants.options.length}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => {
                                    const nextIndex =
                                      (item.variants!.activeIndex + 1) %
                                      item.variants!.options.length;
                                    const nextVariant =
                                      item.variants!.options[nextIndex];
                                    if (nextVariant) {
                                      handleVariantChange(
                                        item.parentId!,
                                        nextVariant.messageId
                                      );
                                    }
                                  }}
                                >
                                  <ChevronRight className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            {index === 0 && (
                              <div
                                className={cn(
                                  "text-xs font-medium text-primary",
                                  !hasVariants && "ml-auto"
                                )}
                              >
                                Latest
                              </div>
                            )}
                            {index === commitsInPath.length - 1 &&
                              index > 0 && (
                                <div
                                  className={cn(
                                    "text-xs font-medium text-muted-foreground",
                                    !hasVariants && "ml-auto"
                                  )}
                                >
                                  Root
                                </div>
                              )}
                          </div>
                        </div>
                      )}

                      {/* Commit content */}
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-left p-0 h-auto hover:bg-transparent group"
                        onClick={() => onSelectCommit(item.commit.sha)}
                      >
                        <div className="w-full hover:bg-accent/50 transition-colors p-4">
                          <div className="flex items-start gap-3">
                            <GitCommit className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-2 mb-1">
                                <div className="font-medium text-sm truncate">
                                  {item.commit.title}
                                </div>
                                <div className="text-xs text-muted-foreground shrink-0">
                                  {formatDate(item.createdAt)}
                                </div>
                              </div>
                              {item.commit.description && (
                                <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                  {item.commit.description}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground font-mono mt-2">
                                {item.commit.sha.slice(0, 7)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Button>
                    </div>

                    {/* Vertical line after card */}
                    {index < commitsInPath.length - 1 && (
                      <div className="absolute left-1/2 -translate-x-1/2 -bottom-4 w-px h-4 bg-gray-300 dark:bg-gray-700" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
