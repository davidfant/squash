import { LogoIcon } from "@/components/Logo";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router";

export function BranchHeader({
  title,
  inlineAction,
  extra,
}: {
  title: string;
  inlineAction?: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between px-2 py-1">
      <div className="flex items-center gap-2">
        <Link to="/" className="flex items-center">
          <LogoIcon className="size-6 hover:opacity-80 transition-opacity" />
        </Link>
        <span className="font-medium text-sm">{title}</span>
        {inlineAction}
      </div>

      <TabsList>
        <TabsTrigger value="preview">Preview</TabsTrigger>
        <TabsTrigger value="code">Code</TabsTrigger>
      </TabsList>

      {extra}
    </header>
  );
}
