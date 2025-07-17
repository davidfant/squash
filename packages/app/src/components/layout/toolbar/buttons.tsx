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
import {
  ArrowUp,
  Command,
  CornerDownLeft,
  Loader2,
  MoreVertical,
  Paperclip,
  Trash2,
} from "lucide-react";

export const SubmitButton = ({
  disabled,
  loading,
  onClick,
}: {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        size="icon"
        disabled={disabled}
        className="rounded-full"
        onClick={onClick}
      >
        {loading ? <Loader2 className="animate-spin" /> : <ArrowUp />}
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <span className="flex items-center gap-1">
        Send <Command className="size-3" /> +{" "}
        <CornerDownLeft className="size-3" />
      </span>
    </TooltipContent>
  </Tooltip>
);

export const AttachButton = ({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) => (
  <Button
    variant="ghost"
    size="icon"
    className="rounded-full text-muted-foreground"
    disabled={disabled}
    onClick={onClick}
  >
    <Paperclip />
  </Button>
);
// export const ChatInputAttachButton = ({
//   disabled,
//   onClick,
// }: {
//   disabled: boolean;
//   onClick: () => void;
// }) => (
//   <Button
//     variant="ghost"
//     className="rounded-full text-muted-foreground"
//     disabled={disabled}
//     onClick={onClick}
//   >
//     <Paperclip /> Attach
//   </Button>
// );

export function SectionOptionsButton({
  onDelete,
  disabled = false,
}: {
  onDelete: () => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="rounded-full"
          disabled={disabled}
        >
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          variant="destructive"
          onClick={onDelete}
          className="gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Delete section
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
