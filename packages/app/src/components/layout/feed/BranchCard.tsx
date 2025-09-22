import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GitBranch, MapPin, MoreHorizontal, Trash2, User } from "lucide-react";
import { Link } from "react-router";

interface BranchCardProps {
  branch: {
    id: string;
    repo: { id: string; name: string };
    name: string;
    createdBy: { name: string };
    updatedAt: string;
  };
  onDelete: (branchId: string) => void;
}

export function BranchCard({ branch, onDelete }: BranchCardProps) {
  return (
    <Card
      key={branch.id}
      className="group relative border border-border/50 bg-card hover:bg-accent/5 transition-colors shadow-none overflow-hidden py-0 cursor-pointer"
    >
      <Link
        to={`/repos/${branch.repo.id}/branches/${branch.id}`}
        className="flex"
      >
        {/* Screenshot Placeholder - Full Height */}
        <div className="shrink-0 w-80 bg-muted" />

        {/* Content */}
        <div className="flex-1 px-6 py-4">
          <div className="mb-3">
            {/* Status Badge */}
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary mb-3">
              In progress
            </div>

            {/* Title */}
            <h3 className="font-semibold text-lg truncate">
              {(branch as any).title || branch.name}
            </h3>

            {/* Description */}
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              A modern web application with responsive design and real-time
              features. Built with the latest technologies for optimal
              performance.
            </p>
          </div>

          {/* Separator */}
          <div className="border-t border-border/50 mb-3" />

          {/* Metadata */}
          <div className="flex items-center gap-2 text-xs overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] -mx-2 px-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 shrink-0">
              <GitBranch className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate max-w-[200px]">
                {branch.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 shrink-0">
              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate max-w-[200px]">
                {branch.repo.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 shrink-0">
              <User className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate max-w-[200px]">
                {branch.createdBy.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 shrink-0">
              <span className="text-muted-foreground whitespace-nowrap">
                Updated{" "}
                {new Date(branch.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Hover Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete(branch.id);
              }}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete branch
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Link>
    </Card>
  );
}
