import { ChatInput } from "@/components/layout/chat/input/ChatInput";
import { Card } from "@/components/ui/card";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export const BranchLayoutSkeleton = () => (
  <SidebarProvider className="flex h-screen flex-col">
    <header className="flex items-center justify-between pr-2 py-2">
      <div className="w-[30%] flex min-w-0 items-center gap-2 pl-2">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-22" />
      </div>
    </header>
    <div className="flex-1 flex">
      <div className="w-[30%] flex flex-col gap-4 p-2 pt-0">
        <div className="flex-1" />
        <ChatInput
          placeholder="Type a message..."
          disabled
          submitting={false}
          onSubmit={() => {}}
        />
      </div>
      <div className="w-[70%] p-2 pt-0">
        <Card className="h-full shadow-none bg-muted"></Card>
      </div>
    </div>
  </SidebarProvider>
);
