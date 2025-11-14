import { useTheme } from "@/contexts/ThemeContext";

export function ComposioToolkitLogo({
  toolkit,
  className,
}: {
  toolkit: string;
  className?: string;
}) {
  const { theme } = useTheme();
  return (
    <img
      src={`https://static.squash.build/logos/${theme}/${toolkit}`}
      className={className}
    />
  );
}
