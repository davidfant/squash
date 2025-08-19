import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, RotateCcw } from "lucide-react";

export const MessageHeader = ({
  author,
  onRetry,
}: {
  author: string;
  onRetry?: () => void;
}) => (
  <div className="relative flex w-full gap-2 rounded-lg py-1">
    <img src="/circle.svg" className="size-5 rounded-sm" />
    <span className="font-medium flex-1 text-sm">{author}</span>

    {onRetry && (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Open message actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onRetry}>
            <RotateCcw />
            Retry
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )}
  </div>
);
