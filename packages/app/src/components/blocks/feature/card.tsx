import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { FeatureCardEditTitleDialog } from "./edit-title-dialog";

export const FeatureCard = ({
  index,
  title,
  subtitle,
  imageUrl,
  avatar,
  className,
  onDelete,
  onEdit,
  onClick,
}: {
  title: string;
  imageUrl: string | null;
  subtitle?: ReactNode;
  avatar?: {
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  };
  index: number;
  className?: string;
  onDelete?(): void;
  onEdit?(value: string): Promise<unknown> | void;
  onClick?(): void;
}) => {
  const hasMenu = !!onDelete || !!onEdit;
  const [isEditing, setEditing] = useState(false);

  return (
    <>
      <Card
        className={cn(
          "p-1 shadow-none gap-1 group border-muted transition-colors hover:border-border",
          className
        )}
        onClick={onClick}
      >
        <div className="relative aspect-3/2 rounded-lg overflow-hidden border-b border-b-muted">
          <div
            className="absolute inset-0 opacity-40 group-hover:opacity-50 transition-opacity"
            style={{
              backgroundImage: `url(/preview/abstract/${index % 4}.jpg)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="w-full h-full p-[5%] pb-0 relative group-hover:scale-105 transition-transform">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={title}
                className="h-full w-full object-cover object-top-left rounded-lg rounded-b-none border-b-0 border-3 border-primary-foreground/30 shadow-lg"
              />
            ) : (
              <div className="h-full rounded-lg border-3 border-primary-foreground/30 rounded-b-none border-b-0 overflow-hidden">
                <div className="h-full bg-muted shadow-lg flex items-center justify-center text-muted-foreground text-xs">
                  No preview
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 px-3 items-center h-10 relative">
          {!!avatar && (
            <Avatar
              name={[avatar.firstName, avatar.lastName]
                .filter(Boolean)
                .join(" ")}
              image={avatar.imageUrl ?? undefined}
              className="size-6"
            />
          )}
          <p className="text-sm text-foreground flex-1 truncate">{title}</p>
          {typeof subtitle === "string" ? (
            <p
              className={cn(
                "text-sm text-muted-foreground",
                hasMenu && "group-hover:opacity-0 transition-opacity"
              )}
            >
              {subtitle}
            </p>
          ) : (
            subtitle
          )}
          {hasMenu && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(true);
                      }}
                    >
                      <Pencil />
                      Rename
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
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
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </Card>
      {onEdit && (
        <FeatureCardEditTitleDialog
          title={title}
          open={isEditing}
          onOpenChange={setEditing}
          onEdit={onEdit}
        />
      )}
    </>
  );
};
