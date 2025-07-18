import { useCallback, useLayoutEffect, useRef, useState } from "react";

export function useStickToBottom() {
  const ref = useRef<HTMLDivElement>(null);

  /** true ↔︎ reader is already at the bottom ± 8 px */
  const [atBottom, setAtBottom] = useState(true);

  /* keep track of manual scrolling */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      const threshold = 8; // px
      const isBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
      setAtBottom(isBottom);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // scroll to bottom animated fn
  const scrollToBottom = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  // scroll to bottom for initial render
  // useEffect(scrollToBottom, [scrollToBottom]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!atBottom) return;

    let prevScrollHeight = el.scrollHeight;
    const abortController = new AbortController();
    function checkScrollHeight() {
      if (abortController.signal.aborted) return;
      if (el!.scrollHeight !== prevScrollHeight) {
        el!.scrollTop = el!.scrollHeight;
        prevScrollHeight = el!.scrollHeight;
      }

      requestAnimationFrame(checkScrollHeight);
    }

    requestAnimationFrame(checkScrollHeight);
    return () => abortController.abort();
  }, [atBottom]);

  /* whenever messages change … */
  // useLayoutEffect(() => {
  //   const el = listRef.current;
  //   if (!el || chat.messages.length === 0) return;

  //   const last = chat.messages[chat.messages.length - 1];

  //   // 1. stick to bottom while reading bottom
  //   if (atBottom && last.role !== "user") {
  //     el.scrollTop = el.scrollHeight; // no smooth scroll → avoids wobble
  //     return;
  //   }

  //   // 2. just sent a user message → pin it to the top
  //   if (last.role === "user") {
  //     // let React paint first
  //     requestAnimationFrame(() => {
  //       const node = document.getElementById(`msg-${last.id}`);
  //       node?.scrollIntoView({ block: "start" });
  //     });
  //   }
  // }, [chat.messages, atBottom]);

  return { ref, atBottom, scrollToBottom };
}
