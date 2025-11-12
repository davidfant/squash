import { Fragment } from "react/jsx-runtime";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../ui/breadcrumb";
import { Separator } from "../ui/separator";
import { SidebarTrigger } from "../ui/sidebar";

export function PageHeader({
  title,
  breadcrumbs,
}: {
  title: string;
  breadcrumbs: Array<{ label: string; href: string }>;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b">
      <div className="flex items-center gap-2 px-3">
        <SidebarTrigger />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((breadcrumb, index) => (
              <Fragment key={index}>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href={breadcrumb.href}>
                    {breadcrumb.label}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
              </Fragment>
            ))}
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
