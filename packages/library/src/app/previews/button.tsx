import { Button, Label } from "@/components/ui";
import { Award, Ghost, Link, Medal, Square, Trash2 } from "lucide-react";

export const ButtonPreviews = () => (
  <div className="space-y-2">
    <Label>Icon</Label>
    <div className="flex gap-4">
      <Button size="icon">
        <Medal />
      </Button>
      <Button size="icon" variant="destructive">
        <Trash2 />
      </Button>
      <Button size="icon" variant="outline">
        <Square />
      </Button>
      <Button size="icon" variant="secondary">
        <Award />
      </Button>
      <Button size="icon" variant="ghost">
        <Ghost />
      </Button>
      <Button size="icon" variant="link">
        <Link />
      </Button>
    </div>

    <Label>Small</Label>
    <div className="flex gap-4">
      <Button size="sm">Default</Button>
      <Button size="sm" variant="destructive">
        Destructive
      </Button>
      <Button size="sm" variant="outline">
        Outline
      </Button>
      <Button size="sm" variant="secondary">
        Secondary
      </Button>
      <Button size="sm" variant="ghost">
        Ghost
      </Button>
      <Button size="sm" variant="link">
        Link
      </Button>
    </div>

    <Label>Default</Label>
    <div className="flex gap-4">
      <Button>Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>

    <Label>Large</Label>
    <div className="flex gap-4">
      <Button size="lg">Default</Button>
      <Button size="lg" variant="destructive">
        Destructive
      </Button>
      <Button size="lg" variant="outline">
        Outline
      </Button>
      <Button size="lg" variant="secondary">
        Secondary
      </Button>
      <Button size="lg" variant="ghost">
        Ghost
      </Button>
      <Button size="lg" variant="link">
        Link
      </Button>
    </div>
  </div>
);
