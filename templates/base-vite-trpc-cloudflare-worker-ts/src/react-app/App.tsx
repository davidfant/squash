import { Button } from "./components/ui/button";
import { trpc } from "./trpc";

export function App() {
  const isConnected = trpc.composio.isConnected.useQuery({
    toolkitSlug: "GITHUB",
  });

  const waitForConnect = trpc.composio.waitForConnect.useMutation({
    onSuccess: () => {
      isConnected.refetch();
    },
  });
  const createConnectLink = trpc.composio.createConnectLink.useMutation({
    onSuccess: (data) => {
      window.open(data.redirectUrl, "_blank");
      waitForConnect.mutate({ connectLinkId: data.id });
    },
  });

  const isLoading = waitForConnect.isPending || createConnectLink.isPending;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center space-y-4">
      <h1 className="text-4xl text-center">Hello World</h1>

      {isConnected.isLoading && <p>Loading connection status...</p>}

      {isConnected.data === true && (
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full bg-green-500"></div>
          <p className="text-green-600 font-medium">Connected</p>
        </div>
      )}

      {isConnected.data === false && (
        <Button
          onClick={() => createConnectLink.mutate({ toolkitSlug: "GITHUB" })}
          disabled={isLoading}
        >
          {isLoading ? "Waiting for connection..." : "Connect"}
        </Button>
      )}

      {createConnectLink.error && (
        <p className="text-red-500 text-sm">
          {createConnectLink.error.message}
        </p>
      )}
    </div>
  );
}
