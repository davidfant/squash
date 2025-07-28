import { Button, Label } from "@/components/ui";
import { Plus } from "lucide-react";

export const ButtonPreviews = () => (
  <div className="space-y-2 p-4">
    <Label>Variants</Label>
    <div className="flex gap-4">
      {(
        ["default", "brand", "primary", "secondary", "ghost", "link"] as const
      ).map((v) => (
        <Button key={v} variant={v}>
          {v}
        </Button>
      ))}
    </div>

    <Label>Sizes</Label>
    <div className="flex gap-4">
      {(["sm", "icon", "default", "lg"] as const).map((v) => (
        <Button key={v} size={v} variant="primary">
          {v === "icon" ? <Plus /> : v}
        </Button>
      ))}
    </div>
  </div>
);
