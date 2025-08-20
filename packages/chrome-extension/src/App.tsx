import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getUserInfoFromToken } from "./lib/auth";

function App() {
  const [status, setStatus] = useState<
    "idle" | "listening" | "received" | "error"
  >("idle");
  const [userLabel, setUserLabel] = useState<string>("");
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    // Load existing token
    chrome.storage.local.get(["authToken"]).then((res) => {
      if (!isMounted) return;
      if (typeof res.authToken === "string") {
        const info = getUserInfoFromToken(res.authToken);
        setUserLabel(info?.email || info?.name || info?.sub || info?.id || "");
        setStatus("received");
      } else {
        setStatus("listening");
      }
    });

    // Subscribe to storage changes
    function handleChange(
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) {
      if (areaName !== "local") return;
      if (changes.authToken) {
        const newVal = changes.authToken.newValue as string | undefined;
        if (newVal) {
          const info = getUserInfoFromToken(newVal);
          setUserLabel(
            info?.email || info?.name || info?.sub || info?.id || ""
          );
          setStatus("received");
        } else {
          setUserLabel("");
          setStatus("listening");
        }
      }
    }
    chrome.storage.onChanged.addListener(handleChange);
    return () => {
      isMounted = false;
      chrome.storage.onChanged.removeListener(handleChange);
    };
  }, []);

  const handleCapturePage = async () => {
    console.log("Starting capture page...");
    setIsCapturing(true);
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      console.log("Active tab:", tab);

      if (tab.id) {
        // Send message to background script to capture the page
        const response = await chrome.runtime.sendMessage({
          action: "capturePage",
          tabId: tab.id,
        });
        console.log("Capture response:", response);
      }
    } catch (error) {
      console.error("Error in handleCapturePage:", error);
      setStatus("error");
    } finally {
      setIsCapturing(false);
    }
  };

  const isAuthenticated = status === "received";

  return (
    <div className="w-[320px] p-6 space-y-4">
      {/* Main Button */}
      <Button
        onClick={handleCapturePage}
        className="w-full h-12 text-base font-medium bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 dark:text-black text-white"
        size="lg"
        disabled={!isAuthenticated || isCapturing}
      >
        {isCapturing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Capturing...
          </>
        ) : (
          <>
            <Camera className="mr-2 h-5 w-5" />
            Capture Page
          </>
        )}
      </Button>

      {/* Auth Status */}
      <div className="flex items-center gap-2 text-sm">
        <div
          className={`w-2 h-2 rounded-full ${
            isAuthenticated ? "bg-green-500" : "bg-red-500"
          }`}
        />
        {isAuthenticated && userLabel ? (
          <span className="text-muted-foreground truncate">{userLabel}</span>
        ) : (
          <span className="text-muted-foreground">Not signed in</span>
        )}
      </div>
    </div>
  );
}

export default App;
