import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { ListTodoIcon, SendIcon, TargetIcon } from "lucide-react";
import { ComponentType } from "react";
import { PageHeader } from "../../components/blocks/page-header";
import { Skeleton } from "../../components/ui/skeleton";

function StepTabsTrigger({
  title,
  icon: Icon,
  value,
}: {
  title: string;
  icon: ComponentType;
  value: string;
}) {
  return (
    <TabsTrigger className="px-8" value={value}>
      {Icon && <Icon />}
      {title}
    </TabsTrigger>
  );
}

function TabsContentSkeleton() {
  return (
    <div className="gap-4 flex flex-col">
      <Skeleton className="h-24 w-full" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-32 flex-1" />
        <Skeleton className="h-32 flex-1" />
        <Skeleton className="h-32 flex-1" />
        <Skeleton className="h-32 flex-1" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export function MyWorkflowPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="My Workflow"
        breadcrumbs={[{ label: "Home", href: "/" }]}
      />
      <div className="p-4 flex-1">
        <Tabs defaultValue="step-1">
          <TabsList className="h-16 w-full">
            <StepTabsTrigger
              title="Step 1"
              icon={ListTodoIcon}
              value="step-1"
            />
            <StepTabsTrigger title="Step 2" icon={TargetIcon} value="step-2" />
            <StepTabsTrigger title="Step 3" icon={SendIcon} value="step-3" />
          </TabsList>
          <TabsContent value="step-1">
            <TabsContentSkeleton />
          </TabsContent>
          <TabsContent value="step-2">
            <TabsContentSkeleton />
          </TabsContent>
          <TabsContent value="step-3">
            <TabsContentSkeleton />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
