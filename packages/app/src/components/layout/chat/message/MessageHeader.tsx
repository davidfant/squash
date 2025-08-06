import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, RotateCcw } from "lucide-react";

export const MessageHeader = ({ author }: { author: string }) => (
  <div className="relative flex w-full gap-2 rounded-lg py-1">
    <img src="/vite.svg" className="size-5 rounded-sm" />
    <span className="font-medium flex-1 text-sm">{author}</span>

    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open message actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem>
          <RotateCcw className="mr-2 h-4 w-4" />
          Retry
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);
