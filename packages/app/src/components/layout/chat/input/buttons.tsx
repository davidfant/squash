import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowUp,
  Check,
  Command,
  CornerDownLeft,
  Loader2,
  Mic,
  Paperclip,
  Square,
  X,
} from "lucide-react";

export const ChatInputSubmitButton = ({
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

export const ChatInputStopButton = ({ onClick }: { onClick: () => void }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        size="icon"
        className="rounded-full"
        variant="secondary"
        onClick={onClick}
      >
        <Square fill="currentColor" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Stop generating</TooltipContent>
  </Tooltip>
);

export const ChatInputDictateButton = ({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        size="icon"
        variant="ghost"
        disabled={disabled}
        className="rounded-full"
        onClick={onClick}
      >
        <Mic />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Dictate</TooltipContent>
  </Tooltip>
);

export const ChatInputDictateCancelButton = ({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        size="icon"
        variant="outline"
        className="rounded-full"
        disabled={disabled}
        onClick={onClick}
      >
        <X />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Cancel</TooltipContent>
  </Tooltip>
);

export const ChatInputDictateStopButton = ({
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
        variant="outline"
        className="rounded-full"
        disabled={disabled}
        onClick={onClick}
      >
        {loading ? <Loader2 className="animate-spin" /> : <Check />}
      </Button>
    </TooltipTrigger>
    <TooltipContent>Transcribe</TooltipContent>
  </Tooltip>
);

export const ChatInputAttachButton = ({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) => (
  <Button
    variant="ghost"
    className="rounded-full"
    disabled={disabled}
    onClick={onClick}
  >
    <Paperclip /> Attach
  </Button>
);
