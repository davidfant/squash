import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MoreHorizontal, Trash2 } from "lucide-react";

export function FeatureCard({
  index,
  title,
  imageUrl,
  date,
  user,
  className,
  onDelete,
  onClick,
}: {
  title: string;
  imageUrl: string | null;
  date?: string;
  user?: { name: string; image: string | null };
  index: number;
  className?: string;
  onDelete?(): void;
  onClick?(): void;
}) {
  // const formattedDate = new Date(date).toLocaleDateString(
  //   undefined,
  //   { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
  // );

  return (
    <div
      className={cn(
        "aspect-[5/4] w-full relative rounded-xl flex flex-col overflow-hidden shadow-md group py-2",
        className
      )}
      style={{
        backgroundImage: `url(/preview/abstract/${index % 4}.jpg)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      onClick={onClick}
    >
      <div className="flex-1 min-h-0 flex items-center justify-center p-[3%]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="h-full aspect-[4/3] object-cover rounded-lg border-3 border-primary-foreground/30 shadow-lg"
          />
        ) : (
          <div className="h-full aspect-[4/3] bg-muted rounded-lg border-3 border-primary-foreground/30 shadow-lg flex items-center justify-center text-muted-foreground text-xs">
            No preview
          </div>
        )}
      </div>
      <div className="flex gap-2 px-3">
        <p className="text-sm text-primary-foreground flex-1 truncate text-shadow-md dark:text-shadow-none">
          {title}
        </p>
        <p className="text-sm text-primary-foreground/70 text-shadow-md dark:text-shadow-none">
          {/* {formattedDate} */}
          date goes here
        </p>
      </div>
      {onDelete && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-0 right-0 bg-transparent shadow-none hover:bg-primary-foreground/10"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              variant="destructive"
            >
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
