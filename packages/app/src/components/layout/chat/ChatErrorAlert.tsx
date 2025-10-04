import { Alert, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useChatContext } from "./context";

export function ChatErrorAlert() {
  const { status, error } = useChatContext();
  if (status !== "error") return null;
  return (
    <Alert className="text-muted-foreground">
      <AlertCircle className="w-4 h-4" />
      <AlertTitle>{error?.message ?? "Unknown error"}</AlertTitle>
    </Alert>
  );
}
