import { useEffect, useState } from "react";

export function ExtensionAuthPage() {
  const [status, setStatus] = useState<"pending" | "success" | "error">(
    "pending"
  );
  useEffect(() => {
    async function getJwt() {
      try {
        const resp = await fetch(`${import.meta.env.VITE_API_URL}/auth/token`, {
          credentials: "include",
        });
        if (!resp.ok) {
          setStatus("error");
          return;
        }
        const data = (await resp.json()) as { token?: string };
        if (data?.token) {
          window.postMessage({ 
            type: "EXTENSION_AUTH", 
            token: data.token,
            apiBase: import.meta.env.VITE_API_URL,
            appUrl: window.location.origin
          }, "*");
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch (_) {
        setStatus("error");
      }
    }
    getJwt();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      {status === "pending" && <div>Authorizing extension…</div>}
      {status === "success" && (
        <div>Authorization successful. You can close this tab.</div>
      )}
      {status === "error" && (
        <div>Authorization failed. Please refresh and try again.</div>
      )}
    </div>
  );
}


