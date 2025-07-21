import html2canvas from "html2canvas-pro";
import { addEventListener, postMessage } from "./messaging";

// Walk up the DOM tree and collect inspector metadata
function collectElementStack(element: HTMLElement) {
  const stack: Array<{ line: number; column: number; file: string }> = [];

  let current: HTMLElement | null = element;

  while (
    current &&
    current !== document.body &&
    current !== document.documentElement
  ) {
    const line = current.getAttribute("data-inspector-line");
    const column = current.getAttribute("data-inspector-column");
    const file = current.getAttribute("data-inspector-relative-path");

    if (!!line && !!column && !!file) {
      stack.push({
        line: parseInt(line, 10),
        column: parseInt(column, 10),
        file,
      });
    }

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
  display: "none", // Hidden by default
});
document.body.appendChild(overlay);

// --- state management -----------------------------------------------------
let isHighlightingEnabled = false;
let hoverHandler: ((e: PointerEvent) => void) | null = null;
let clickHandler: ((e: MouseEvent) => void) | null = null;

// --- hover handler (simplified - only shows overlay) ---------------------
function onPointerMove(e: PointerEvent) {
  if (!isHighlightingEnabled) return;

  const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
  if (!target) return;

  // Position the overlay on the target element
  const box = target.getBoundingClientRect();

  overlay.style.transform = `translate(${
    box.left + scrollX - BORDER_WIDTH
  }px, ${box.top + scrollY - BORDER_WIDTH}px)`;
  overlay.style.width = box.width + BORDER_WIDTH * 2 + "px";
  overlay.style.height = box.height + BORDER_WIDTH * 2 + "px";
}

// --- click handler (collects element stack and takes screenshot) ---------
async function onClick(e: MouseEvent) {
  if (!isHighlightingEnabled) return;

  // Prevent the event from propagating and prevent default behavior
  e.preventDefault();
  e.stopPropagation();

  const target = e.target as HTMLElement;
  if (!target) return;

  // Collect the entire stack of DOM elements with inspector metadata
  const elementStack = collectElementStack(target);
  const elementWithSource = elementStack.find((item) => item.file);
  const box = target.getBoundingClientRect();

  try {
    // overlay.style.display = "none";
    const canvas = await html2canvas(document.body, {
      useCORS: true,
      allowTaint: true,
      scale: 2,

      x: window.scrollX,
      y: window.scrollY,
      width: window.innerWidth,
      height: window.innerHeight,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
    });
    // overlay.style.display = "block";

    const screenshot = canvas.toDataURL("image/webp");

    postMessage({
      type: "InlineComment",
      stack: elementStack,
      screenshot,
      box,
    });
  } catch (error) {
    console.error("Failed to take screenshot:", error);
    postMessage({
      type: "InlineComment",
      stack: elementStack,
      screenshot: null,
      box,
    });
  }
}

export function enableHighlighting(): void {
  if (isHighlightingEnabled) return;

  isHighlightingEnabled = true;
  overlay.style.display = "block";

  // Add event listeners
  hoverHandler = onPointerMove;
  clickHandler = onClick;

  window.addEventListener("pointermove", hoverHandler);
  window.addEventListener("click", clickHandler, { capture: true });
}

export function disableHighlighting(): void {
  if (!isHighlightingEnabled) return;

  isHighlightingEnabled = false;
  overlay.style.display = "none";

  // Remove event listeners
  if (hoverHandler) {
    window.removeEventListener("pointermove", hoverHandler);
    hoverHandler = null;
  }

  if (clickHandler) {
    window.removeEventListener("click", clickHandler, { capture: true });
    clickHandler = null;
  }
}

export const addInlineCommentSettingsListener = () =>
  addEventListener("InlineCommentSettings", (message) => {
    if (message.enabled) {
      enableHighlighting();
    } else {
      disableHighlighting();
    }
  });
