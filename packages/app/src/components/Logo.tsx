import { cn } from "@/lib/utils";

export const LogoIcon = ({ className }: { className?: string }) => (
  <svg
    width="70"
    height="69"
    viewBox="0 0 70 69"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Base segment defined once */}
    <defs>
      <path
        id="logo-segment"
        d="M9.42943 40.6782C4.97523 42.1254 0.155528 39.4257 0.141394 34.7423C0.129388 30.764 0.738681 26.7162 2.035 22.7265C3.22286 19.0707 4.90583 15.714 6.98556 12.7067C9.68782 8.79922 15.2754 9.39427 18.0679 13.2378L26.075 24.259C29.2696 28.656 27.2438 34.8903 22.0748 36.5697L9.42943 40.6782Z"
        fill="currentColor"
      />
    </defs>

    {/* Repeat the segment five times around the center (35, 34.5) */}
    <g className="*:origin-center">
      <use href="#logo-segment" />
      <use href="#logo-segment" transform="rotate(72)" />
      <use href="#logo-segment" transform="rotate(144)" />
      <use href="#logo-segment" transform="rotate(216)" />
      <use href="#logo-segment" transform="rotate(288)" />
    </g>
  </svg>
);

export const Logo = ({ className = "" }: { className?: string }) => (
  <div className={cn("flex items-center gap-2 group", className)}>
    <LogoIcon className="size-6 text-brand group-hover:rotate-36 transition-transform duration-300" />
    <h6 className="text-xl font-display">Squash</h6>
  </div>
);
