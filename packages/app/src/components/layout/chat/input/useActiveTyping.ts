import { useCallback, useRef, useState } from "react";

interface Options {
  minDurationMs?: number;
  idleTimeoutMs?: number;
}

export function useActiveTyping(
  opts: Options = {}
): [boolean, (node: HTMLTextAreaElement | null) => void] {
  const { minDurationMs = 3000, idleTimeoutMs = 2500 } = opts;
  const [active, setActive] = useState(false);
  const startTime = useRef<number | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const resetIdle = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setActive(false), idleTimeoutMs);
  };

  const onInput = useCallback(() => {
    if (startTime.current === null) startTime.current = performance.now();

    const elapsed = performance.now() - startTime.current;
    if (!active && elapsed >= minDurationMs) {
      setActive(true);
    }
    resetIdle();
  }, [active, idleTimeoutMs, minDurationMs]);

  const register = useCallback(
    (node: HTMLTextAreaElement | null) => {
      node?.addEventListener("input", onInput);
    },
    [onInput]
  );

  return [active, register];
}
