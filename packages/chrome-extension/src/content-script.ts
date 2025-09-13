// Listen for the handshake message from the web page and store the JWT
window.addEventListener("message", (event: MessageEvent) => {
  if (event.source !== window) return;
  const data = event.data as {
    type?: string;
    token?: string;
    apiBase?: string;
    appUrl?: string;
  };
  if (data?.type === "EXTENSION_AUTH" && typeof data.token === "string") {
    chrome.storage.local.set({
      authToken: data.token,
      apiBase: data.apiBase || undefined,
      appUrl: data.appUrl || undefined,
    });
  }
});
