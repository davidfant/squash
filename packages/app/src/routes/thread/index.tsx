import { authClient } from "@/auth";
import { ChatThread } from "@/components/layout/chat/ChatThread";
import { ChatProvider } from "@/components/layout/chat/context";
import { api, useQuery } from "@/hooks/api";
import { useParams } from "react-router";

export function ThreadPage() {
  const { threadId } = useParams();
  const threadMessages = useQuery(api.chat.messages.threads[":threadId"].$get, {
    params: { threadId },
  });
  const session = authClient.useSession();

  return (
    <ChatProvider
      ready={!session.isPending}
      endpoint={`threads/${threadId}`}
      initialMessages={threadMessages.data}
      // autoSubmit={autoSubmit ? initialValue : undefined}
      // onSendMessage={async (parts, messages) => {
      //   const isQualified = messages
      //     .flatMap((m) => m.parts)
      //     .some((p) => p.type === "qualified" && p.qualified);

      //   setInitialValue([]);
      //   if (!isQualified) return true;

      //   if (isAuthenticated) {
      //     await handleCreateWorkflow(parts);
      //   } else {
      //     setInitialValue(parts);
      //     const url = new URL(window.location.href);
      //     url.searchParams.set("autoSubmit", "1");
      //     signIn(url.toString());
      //   }

      //   return false;

      //   // add message to thread
      //   // create workflow
      //   // redirect to workflow page
      // }}
    >
      <ChatThread />
      {/* <div className="w-screen h-screen bg-background flex flex-col">
        <Header title="Godmode" />
        <div className="flex p-4 pt-0 flex-1 min-h-0">
          <ChatThread initialValue={initialValue} />
          <Card className="flex-1 p-0 bg-muted overflow-hidden">
            <div className="w-full h-full fade-in">
              <AppSkeleton className="animate-none" />
            </div>
          </Card>
        </div>
      </div>
      <SignInModal /> */}
    </ChatProvider>
  );
}
