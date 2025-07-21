// Walk up the DOM tree and collect inspector metadata
function collectElementStack(element: HTMLElement) {
  const stack: Array<{
    tagName: string;
    line?: number;
    column?: number;
    file?: string;
    element: HTMLElement;
  }> = [];

  let current: HTMLElement | null = element;

  while (
    current &&
    current !== document.body &&
    current !== document.documentElement
  ) {
    const line = current.getAttribute("data-inspector-line");
    const column = current.getAttribute("data-inspector-column");
    const file = current.getAttribute("data-inspector-relative-path");

    stack.push({
      tagName: current.tagName.toLowerCase(),
      line: line ? parseInt(line, 10) : undefined,
      column: column ? parseInt(column, 10) : undefined,
      file: file || undefined,
      element: current,
    });

    current = current.parentElement;
  }

  return stack;
}

const BORDER_WIDTH = 4;

// --- overlay singleton -----------------------------------------------------
const overlay = document.createElement("div");
Object.assign(overlay.style, {
  position: "absolute",
  top: 0,
  left: 0,
  zIndex: "2147483647",
  pointerEvents: "none",
  border: `${BORDER_WIDTH}px dashed #38bdf8`,
  borderRadius: "12px",
  transition: "transform 200ms ease, width 200ms, height 200ms",
});
document.body.appendChild(overlay);

// --- main listener ---------------------------------------------------------
window.addEventListener("pointermove", (e) => {
  const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
  if (!target) return;

  // Collect the entire stack of DOM elements with inspector metadata
  const elementStack = collectElementStack(target);

  // Position the overlay on the target element
  const box = target.getBoundingClientRect();

  overlay.style.transform = `translate(${
    box.left + scrollX - BORDER_WIDTH
  }px, ${box.top + scrollY - BORDER_WIDTH}px)`;
  overlay.style.width = box.width + BORDER_WIDTH * 2 + "px";
  overlay.style.height = box.height + BORDER_WIDTH * 2 + "px";

  // Find the most specific element with file information
  const elementWithSource = elementStack.find((item) => item.file);

  // Log the complete element stack with inspector metadata
  console.log("Element Stack:", elementStack);
  console.log(target, {
    cmd: "PICKER_HOVER",
    file: elementWithSource?.file || "unknown",
    line: elementWithSource?.line,
    column: elementWithSource?.column,
    elementStack,
    rect: box,
  });

  parent.postMessage(
    {
      cmd: "PICKER_HOVER",
      file: elementWithSource?.file || "unknown",
      line: elementWithSource?.line,
      column: elementWithSource?.column,
      elementStack,
      rect: box,
    },
    "*"
  );
});
