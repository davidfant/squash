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
  display: "none", // Hidden by default
});
document.body.appendChild(overlay);

let isHighlightingEnabled = false;
let latestTarget: HTMLElement | null = null;

function onPointerMove(e: PointerEvent) {
  if (!isHighlightingEnabled) return;

  const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
  if (!target) return;

  latestTarget = target;
  updateOverlayPosition(target, true);
}

function updateOverlayPosition(target: HTMLElement, animate: boolean = false) {
  const box = target.getBoundingClientRect();

  const x0 = box.left + window.scrollX;
  const y0 = box.top + window.scrollY;
  const x1 = x0 + box.width;
  const y1 = y0 + box.height;

  const x = Math.max(x0 - BORDER_WIDTH, 0);
  const y = Math.max(y0 - BORDER_WIDTH, 0);
  const w = Math.min(x1 + BORDER_WIDTH - x, window.innerWidth);
  const h = Math.min(y1 + BORDER_WIDTH - y, window.innerHeight);

  overlay.style.display = "block";
  overlay.style.transform = `translate(${x}px, ${y}px)`;
  overlay.style.width = `${w}px`;
  overlay.style.height = `${h}px`;
  overlay.style.transition = animate
    ? "transform 200ms ease, width 200ms, height 200ms"
    : "none";
}

function onResize() {
  if (!isHighlightingEnabled || !latestTarget) return;
  updateOverlayPosition(latestTarget);
}

function onPointerLeave() {
  if (!isHighlightingEnabled) return;

  // Hide overlay and clear target when pointer leaves the screen
  overlay.style.display = "none";
  latestTarget = null;
}

// --- click andler (collects element stack and takes screenshot) ---------
async function onClick(e: MouseEvent) {
  if (!isHighlightingEnabled) return;

  // Prevent the event from propagating and prevent default behavior
  e.preventDefault();
  e.stopPropagation();

  const target = e.target as HTMLElement;
  if (!target) return;

  // Collect the entire stack of DOM elements with inspector metadata
  const elementStack = collectElementStack(target);
  const box = target.getBoundingClientRect();
  const point = { x: e.clientX, y: e.clientY };
  const id = Date.now().toString();

  postMessage({
    type: "InlineComment",
    id,
    stack: elementStack,
    box,
    point,
  });

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
      type: "InlineCommentScreenshot",
      id,
      screenshot,
    });
  } catch (error) {
    console.error("Failed to take screenshot:", error);
  }
}

export function enableHighlighting(): void {
  if (isHighlightingEnabled) return;

  isHighlightingEnabled = true;

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("click", onClick, { capture: true });
  window.addEventListener("resize", onResize);
  document.addEventListener("pointerleave", onPointerLeave);
}

export function disableHighlighting(): void {
  if (!isHighlightingEnabled) return;

  isHighlightingEnabled = false;
  overlay.style.display = "none";

  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("click", onClick, { capture: true });
  window.removeEventListener("resize", onResize);
  document.removeEventListener("pointerleave", onPointerLeave);

  latestTarget = null;
}

export const addInlineCommentSettingsListener = () =>
  addEventListener("InlineCommentSettings", (message) => {
    if (message.enabled) {
      enableHighlighting();
    } else {
      disableHighlighting();
    }
  });
