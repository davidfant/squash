import { Plus } from "lucide-react";
import { useState } from "react";
import { CloneScreenshotDialog } from "./clone-screenshot-dialog";

export const CreateRepoCard = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="aspect-[268/226] rounded-xl group border-2 border-dashed border-border grid place-items-center cursor-pointer hover:border-muted-foreground transition-colors"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-8 text-border group-hover:text-muted-foreground transition-colors" />
      </div>
      <CloneScreenshotDialog open={open} onOpenChange={setOpen} />
    </>
  );
};
