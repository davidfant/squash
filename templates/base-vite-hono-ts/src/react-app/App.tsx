import { trpc } from "./trpc";

export function App() {
  const res = trpc.index.useQuery();
  return (
    <div className="flex min-h-svh flex-col items-center justify-center space-y-4">
      <h1 className="text-4xl text-center">{res.data?.name} Starter Project</h1>
      <p className="text-xl text-muted-foreground text-center">
        Start building your project by chatting with Squash.
      </p>
    </div>
  );
}
