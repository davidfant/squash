import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ConnectToToolkitBlock } from "./groupMessageEvents";

export function ConnectToToolkitAlert({
  block,
}: {
  block: ConnectToToolkitBlock;
}) {
  return (
    <Alert className="flex items-center gap-3 py-2 min-h-12">
      <img
        src={block.toolkit.logoUrl}
        alt={`${block.toolkit.name} logo`}
        className="size-4"
      />
      <AlertTitle className="flex-1 m-0">
        Connect to {block.toolkit.name}
      </AlertTitle>
      <a href={block.redirectUrl} target="_blank" rel="noopener noreferrer">
        <Button variant="default" size="sm">
          Connect
        </Button>
      </a>
    </Alert>
  );
}
