import { PageHeader } from "../../components/blocks/page-header";

export function MyWorkflowPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="My Workflow"
        breadcrumbs={[{ label: "Home", href: "/" }]}
      />
      <div className="p-4 flex-1 grid place-items-center">
        <p className="text-muted-foreground">
          Your workflow will be built here in a bit
        </p>
      </div>
    </div>
  );
}
