import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { SandboxTaskMessage } from "@squashai/api/agent/types";
import type { Sandbox } from "@squashai/api/sandbox/types";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check } from "lucide-react";
import { useState } from "react";
import { Spinner } from "../ui/spinner";

const stdoutOrStderr = (
  e: Sandbox.Exec.Event.Any
): e is Sandbox.Exec.Event.Stdout | Sandbox.Exec.Event.Stderr =>
  e.type === "stdout" || e.type === "stderr";

export function SandboxTaskStream({
  label,
  stream,
}: {
  label?: string;
  stream: UseChatHelpers<SandboxTaskMessage>;
}) {
  const [showDetails, setShowDetails] = useState(false);

  const tasks = stream.messages
    .flatMap((m) => m.parts)
    .filter((p) => p.type === "tool-SandboxTask")
    .filter((t) => !!t.input?.title);
  console.log("SandboxTaskStream", tasks);

  if (!tasks.length) return null;
  return (
    <AnimatePresence initial={false}>
      {label && (
        <motion.div
          layout
          key="label"
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <Label>{label}</Label>
        </motion.div>
      )}
      {tasks.map((t) => {
        const alert =
          t.state === "output-error" ? (
            <Alert variant="destructive" className="overflow-x-scroll">
              <AlertCircle />
              <AlertTitle>{t.input?.title}</AlertTitle>
              {showDetails && (
                <AlertDescription className="font-mono whitespace-pre-wrap">
                  {t.input?.events
                    ?.filter(stdoutOrStderr)
                    .map((e) => `[${e.timestamp}] ${e.data}`)
                    .join("")}
                </AlertDescription>
              )}
            </Alert>
          ) : (
            <Alert className="text-muted-foreground overflow-x-scroll">
              {t.state === "output-available" ? <Check /> : <Spinner />}
              <AlertTitle>{t.input?.title}</AlertTitle>
              {showDetails && (
                <AlertDescription className="font-mono whitespace-pre-wrap">
                  {t.input?.events
                    ?.filter(stdoutOrStderr)
                    .map((e) => `[${e.timestamp}] ${e.data}`)
                    .join("")}
                </AlertDescription>
              )}
            </Alert>
          );
        return (
          <motion.div
            layout
            key={t.toolCallId}
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-full max-w-sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {alert}
          </motion.div>
        );
      })}
      {/* {stream.status === "error" && (
        <motion.div
          layout
          key="error"
          initial={{ opacity: 0, scale: 0.95, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>{stream.error?.message ?? "Unknown error"}</AlertTitle>
          </Alert>
        </motion.div>
      )} */}
    </AnimatePresence>
  );
}
