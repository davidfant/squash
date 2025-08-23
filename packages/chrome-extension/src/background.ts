import type { Snapshot } from "@squash/replicator";
import { v4 as uuid } from "uuid";

interface ApiResponse {
  success: boolean;
  key?: string;
  repoId?: string;
  error?: string;
}

interface StorageConfig {
  authToken: string;
  apiBase: string;
  appUrl: string;
}

async function getStorageConfig(): Promise<StorageConfig> {
  const { authToken, apiBase, appUrl } = await chrome.storage.local.get([
    "authToken",
    "apiBase",
    "appUrl",
  ]);

  if (!authToken || !apiBase) {
    throw new Error(
      "Missing authentication credentials. Please configure the extension first."
    );
  }

  return { authToken, apiBase, appUrl };
}

// Main page capture functionality
async function capturePage(tabId: number): Promise<void> {
  try {
    const config = await getStorageConfig();
    console.log("Starting page capture for tab:", tabId);

    // Generate session ID
    const sessionId = uuid();
    console.log("Generated session ID:", sessionId);

    // Inject script to collect page data
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => ({
        url: location.href,
        title: document.title,
        html: document.documentElement.outerHTML,
      }),
    });

    const page = results[0]?.result;
    if (!page) {
      throw new Error("Failed to extract page data");
    }

    console.log("Extracted page data:", {
      url: page.url,
      title: page.title,
    });

    await uploadSnapshot(sessionId, { page }, config);
    const repoId = await processSession(sessionId, config);
    await navigateToRepo(repoId, config);

    console.log("Page capture completed successfully!");
  } catch (error) {
    console.error("Page capture failed:", error);
    // Show error notification
    await chrome.notifications.create({
      type: "basic",
      iconUrl: "circle.svg",
      title: "Page Capture Failed",
      message:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
}

async function uploadSnapshot(
  sessionId: string,
  snapshot: Snapshot,
  config: StorageConfig
): Promise<void> {
  console.log("Uploading snapshot for session:", sessionId);

  const response = await fetch(
    `${config.apiBase}/replicator/${sessionId}/snapshot`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(snapshot),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Snapshot upload failed: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const result: ApiResponse = await response.json();
  if (!result.success) {
    throw new Error(
      `Snapshot upload failed: ${result.error || "Unknown error"}`
    );
  }

  console.log("Snapshot uploaded successfully:", result.key);
}

async function processSession(
  sessionId: string,
  config: StorageConfig
): Promise<string> {
  console.log("Processing session:", sessionId);

  const response = await fetch(`${config.apiBase}/replicator/${sessionId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.authToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Session processing failed: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const result: ApiResponse = await response.json();
  if (!result.repoId) {
    throw new Error(
      `Session processing failed: ${result.error || "No repo ID returned"}`
    );
  }

  console.log("Session processed successfully, repo ID:", result.repoId);
  return result.repoId;
}

async function navigateToRepo(
  repoId: string,
  config: StorageConfig
): Promise<void> {
  console.log("Navigating to repo:", repoId);
  await chrome.tabs.create({ url: `${config.appUrl}/repos/${repoId}` });
}

// Event listeners
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) {
    console.error("No tab ID available");
    return;
  }

  await capturePage(tab.id);
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "ping") {
    sendResponse({
      success: true,
      message: "pong",
      timestamp: new Date().toISOString(),
    });
    return false;
  }

  if (request.action === "capturePage" && request.tabId) {
    console.log("wow bg...");
    // capturePage(request.tabId)
    //   .then(() => sendResponse({ success: true }))
    //   .catch((error) => {
    //     console.error("Capture page error:", error);
    //     sendResponse({
    //       success: false,
    //       error: error instanceof Error ? error.message : String(error),
    //     });
    //   });
    return true; // Keep message channel open for async response
  }

  sendResponse({ success: false, error: "Unknown action" });
  return false;
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log("Extension started");
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed/updated");
});
