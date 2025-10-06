import { cn } from "@/lib/utils";

export const Logo = ({ className = "" }: { className?: string }) => (
  <div className={cn("flex items-center gap-2", className)}>
    <img
      src="/preview/gradients/0.jpg"
      alt="Squash"
      className="size-6 rounded-full"
    />
    <span className="text-xl">Squash</span>
  </div>
);

