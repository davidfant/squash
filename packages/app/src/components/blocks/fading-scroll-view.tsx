import { cn } from "@/lib/utils";
import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";
import { mergeRefs } from "react-merge-refs";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const FadingScrollView = forwardRef<
  HTMLDivElement,
  { children: ReactNode; className?: string; height?: number }
>(({ children, className, height = 32 }, ref) => {
  const _ref = useRef<HTMLDivElement>(null);

  const [fadeTop, setFadeTop] = useState(0);
  const [fadeBottom, setFadeBottom] = useState(0);

  useEffect(() => {
    const el = _ref.current;
    if (!el) return;

    const update = () => {
      setFadeTop(clamp(el.scrollTop, 0, height));
      setFadeBottom(
        clamp(el.scrollHeight - el.scrollTop - el.clientHeight, 0, height)
      );
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [height]);

  const mask = (() => {
    if (!fadeTop && !fadeBottom) return undefined;
    if (fadeTop && fadeBottom) {
      return `linear-gradient(to bottom,
        transparent 0px,
        black ${fadeTop}px,
        black calc(100% - ${fadeBottom}px),
        transparent 100%)`;
    }
    if (fadeTop) {
      return `linear-gradient(to bottom,
        transparent 0px,
        black ${fadeTop}px,
        black 100%)`;
    }
    // fadeBottom only
    return `linear-gradient(to bottom,
      black 0px,
      black calc(100% - ${fadeBottom}px),
      transparent 100%)`;
  })();

  return (
    <div
      ref={mergeRefs([ref, _ref])}
      className={cn("overflow-y-auto", className)}
      style={{ mask, WebkitMask: mask }}
    >
      {children}
    </div>
  );
});
