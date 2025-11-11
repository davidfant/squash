import { cn } from "@/lib/utils";

export const LogoIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn(className, "text-primary dark:text-primary/30")}
  >
    {/* Background circle uses currentColor (primary) */}
    <path
      d="M16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8C0 3.58172 3.58172 0 8 0C12.4183 0 16 3.58172 16 8Z"
      fill="currentColor"
    />
    {/* Eye circles remain yellow */}
    <path
      d="M7.11111 4.88889C7.11111 5.37981 6.71314 5.77778 6.22222 5.77778C5.7313 5.77778 5.33333 5.37981 5.33333 4.88889C5.33333 4.39797 5.7313 4 6.22222 4C6.71314 4 7.11111 4.39797 7.11111 4.88889Z"
      fill="#FFE818"
    />
    <path
      d="M10.6664 4.88889C10.6664 5.37981 10.2685 5.77778 9.77756 5.77778C9.28664 5.77778 8.88867 5.37981 8.88867 4.88889C8.88867 4.39797 9.28664 4 9.77756 4C10.2685 4 10.6664 4.39797 10.6664 4.88889Z"
      fill="#FFE818"
    />
  </svg>
);

export const Logo = ({ className = "" }: { className?: string }) => (
  <div className={cn("flex items-center gap-2", className)}>
    <LogoIcon className="size-6" />
    <span className="text-xl">Squash</span>
  </div>
);
