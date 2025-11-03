import { SidebarTrigger } from "@/components/ui/sidebar";

export const SiteHeader = ({
  title,
  extra,
}: {
  title?: string;
  extra?: React.ReactNode;
}) => (
  <header className="flex shrink-0 items-center gap-2 px-4 py-2 h-12">
    <SidebarTrigger className="-ml-2" />
    {title && <h1 className="flex-1 text-lg">{title}</h1>}
    {extra}
  </header>
);
