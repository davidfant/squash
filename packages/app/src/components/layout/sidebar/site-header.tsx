import { SidebarTrigger } from "@/components/ui/sidebar";

export const SiteHeader = ({ title }: { title: string }) => (
  <header className="flex shrink-0 items-center gap-2 px-4 py-2">
    <SidebarTrigger className="-ml-2" />
    <h1>{title}</h1>
  </header>
);
