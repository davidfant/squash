import html2canvas from "html2canvas-pro";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { SquashIframeBridge } from "./bridge";
import { onLocationChange } from "./on-location-change";

interface SquashContextValue {
  token: string | undefined;
}

const SquashContext = createContext<SquashContextValue | undefined>(undefined);

export function SquashProvider({
  children,
  debug,
}: {
  children: ReactNode;
  debug?: boolean;
}) {
  const [token, setToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!window.top || window.top === window.self) return;

    const bridge = new SquashIframeBridge(window.top, { debug });
    bridge.post({
      source: "@squashai/iframe-bridge",
      id: crypto.randomUUID(),
      command: "connected",
    });
    const unsubs = [
      bridge.on("jwt-token", (payload) => setToken(payload.token)),
      bridge.on("capture-screenshot", async (command) => {
        const screenshot = await html2canvas(document.body);
        const base64 = screenshot.toDataURL("image/webp");
        bridge.post({
          source: "@squashai/iframe-bridge",
          id: command.id,
          command: "submit-screenshot",
          mimeType: "image/png",
          base64,
        });
      }),
      onLocationChange(() =>
        bridge.post({
          source: "@squashai/iframe-bridge",
          id: crypto.randomUUID(),
          command: "navigate",
          path: window.location.pathname,
        })
      ),
      () => bridge.dispose(),
    ];
    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  return (
    <SquashContext.Provider value={{ token }}>
      {children}
    </SquashContext.Provider>
  );
}

export function useSquash() {
  const context = useContext(SquashContext);
  if (!context) {
    throw new Error("useSquash must be used within a SquashProvider");
  }
  return context;
}
