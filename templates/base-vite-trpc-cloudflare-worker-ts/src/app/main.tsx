import { SquashProvider, useSquash } from "@squashai/iframe-bridge";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./App";
import { Toaster } from "./components/ui/sonner";
import "./index.css";
import { trpc } from "./trpc";

function Root() {
  const { token } = useSquash();
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          headers: () =>
            tokenRef.current
              ? { Authorization: `Bearer ${tokenRef.current}` }
              : {},
        }),
      ],
    })
  );

  useEffect(() => {
    queryClient.invalidateQueries();
  }, [!!token]);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster />
        </BrowserRouter>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SquashProvider debug={import.meta.env.MODE === "development"}>
      <Root />
    </SquashProvider>
  </StrictMode>
);
