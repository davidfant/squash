import type { DictationStatus } from "./useDictation";

export const DictationOverlay = ({
  status,
  levels,
}: {
  status: DictationStatus;
  levels: number[];
}) => {
  if (status === "recording") {
    return (
      <div className="w-full h-full flex gap-2 items-center justify-center">
        <p className="text-muted-foreground">Listening</p>
        <div
          className="flex gap-[1px] h-6 items-center"
          style={{
            mask: "linear-gradient(90deg, transparent, black 20px)",
            WebkitMask: "linear-gradient(90deg, transparent, black 20px)",
          }}
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-[2px] bg-muted-foreground rounded-full"
              style={{
                height: `${Math.min(levels[i] ?? 0, 1) * 100}%`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }
  if (status === "transcribing") {
    return (
      <div className="w-full h-full flex gap-2 items-center justify-center text-muted-foreground">
        Transcribing...
      </div>
    );
  }

  return null;
};
