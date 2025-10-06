import { Plus } from "lucide-react";

export const CreateRepoCard = () => (
  <div className="aspect-[5/4] rounded-xl group border-2 border-dashed border-border grid place-items-center cursor-pointer hover:border-muted-foreground transition-colors">
    <Plus className="size-8 text-border group-hover:text-muted-foreground transition-colors" />
  </div>
);
