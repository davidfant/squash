import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { Link } from "react-router";

export function BranchCard({
  branch,
  index,
  onDelete,
}: {
  branch: {
    id: string;
    title: string;
    updatedAt: string;
    imageUrl: string | null;
  };
  index: number;
  onDelete: () => void;
}) {
  const formattedDate = new Date(branch.updatedAt).toLocaleDateString(
    undefined,
    { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
  );

  return (
    <Link to={`/branches/${branch.id}`}>
      <div
        className="aspect-[4/3] w-full relative rounded-xl flex flex-col overflow-hidden shadow-sm group"
        style={{
          backgroundImage: `url(/preview/abstract/${index % 4}.jpg)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="flex-1 min-h-0 flex items-center justify-center p-[7%]">
          {branch.imageUrl && (
            <img
              src={branch.imageUrl}
              alt={branch.title}
              className="h-full aspect-[4/3] object-cover rounded-lg border-3 border-primary-foreground/30 shadow-lg"
            />
          )}
        </div>
        <div className="flex gap-2 p-3 pt-0">
          <p className="text-sm text-primary-foreground flex-1 truncate text-shadow-md dark:text-shadow-none">
            {branch.title}
          </p>
          <p className="text-sm text-primary-foreground/70 text-shadow-md dark:text-shadow-none">
            {formattedDate}
          </p>
        </div>
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
      </div>
    </Link>
  );
}
