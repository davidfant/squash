export function onLocationChange(callback: () => void) {
  // Monkey-patch pushState & replaceState
  const origPush = window.history.pushState;
  const origReplace = window.history.replaceState;

  window.history.pushState = function (...args) {
    origPush.apply(window.history, args);
    callback();
  };
  window.history.replaceState = function (...args) {
    origReplace.apply(window.history, args);
    callback();
  };

  // Listen for back/forward
  window.addEventListener("popstate", callback);

  // Cleanup on unmount
  return () => {
    window.history.pushState = origPush;
    window.history.replaceState = origReplace;
    window.removeEventListener("popstate", callback);
  };
}
