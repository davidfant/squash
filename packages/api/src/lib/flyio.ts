interface FlyMachine {
  id: string;
  name: string;
  state: string;
  region: string;
  instance_id: string;
  private_ip: string;
  created_at: string;
  updated_at: string;
  config: any;
}

export async function createFlyApp(
  appName: string,
  apiKey: string
): Promise<{ id: string }> {
  const response = await fetch("https://api.machines.dev/v1/apps", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_name: appName,
      network: `${appName}-network`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create Fly.io app: ${response.statusText}`);
  }

  // Allocate an IPv4 address for the app to make it accessible
  // const ipResponse = await fetch(
  //   `https://api.machines.dev/v1/apps/${appName}/ip-addresses`,
  //   {
  //     method: "POST",
  //     headers: {
  //       Authorization: `Bearer ${apiKey}`,
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify({
  //       type: "v4",
  //     }),
  //   }
  // );

  // if (!ipResponse.ok) {
  //   console.warn(
  //     `Failed to allocate IP for app ${appName}: ${ipResponse.statusText}`
  //   );
  //   // Don't fail the entire process if IP allocation fails
  // }

  return response.json();
}

// Helper function to create Fly.io machine
export async function createFlyMachine(
  appName: string,
  apiKey: string
): Promise<FlyMachine> {
  const response = await fetch(
    `https://api.machines.dev/v1/apps/${appName}/machines`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        config: {
          image: "node:20-alpine",
          size: "performance-2x",
          auto_destroy: false,
          restart: { policy: "no" },
          services: [
            {
              protocol: "tcp",
              internal_port: 3000,
              ports: [
                { port: 80, handlers: ["http"] },
                { port: 443, handlers: ["tls", "http"] },
              ],
              autostop: "stop",
              autostart: true,
            },
          ],
          checks: {
            health: {
              type: "http",
              port: 3000,
              method: "GET",
              path: "/",
              interval: "5s",
              timeout: "5s",
              grace_period: "10s",
            },
          },
          env: { PORT: "3000" },
          init: {
            // Start a simple HTTP server that shuts down after 10 minutes of inactivity
            exec: [
              "sh",
              "-c",
              `
              npm install -g http-server &&
              mkdir -p /app &&
              echo '<!DOCTYPE html><html><head><title>Dev Server</title></head><body><h1>Development Server Ready</h1><p>Port 3000 is active</p></body></html>' > /app/index.html &&
              cd /app &&
              timeout 600 http-server -p 3000 -a 0.0.0.0 || exit 0
            `.trim(),
            ],
          },
          stop_config: { timeout: 10, signal: "SIGTERM" },
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create Fly.io machine: ${response.statusText}`);
  }

  return response.json() as Promise<FlyMachine>;
}
