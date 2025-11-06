import { LogoIcon } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Protect, useClerk } from "@clerk/clerk-react";
import {
  AppWindowIcon,
  CodeXmlIcon,
  PanelLeftClose,
  PanelLeftOpen,
  UserPlus,
} from "lucide-react";
import { Link } from "react-router";
import { AddressBar } from "./address-bar";
import { ShareButton } from "./ShareButton";

const tabs = [
  { label: "Preview", value: "preview", icon: AppWindowIcon },
  { label: "Code", value: "code", icon: CodeXmlIcon },
];

export function BranchHeader({
  title,
  siderWidth,
  onToggleSider,
}: {
  title: string;
  siderWidth: number | undefined;
  onToggleSider: () => void;
}) {
  const clerk = useClerk();
  const isSiderVisible = siderWidth !== undefined;
  return (
    <header className="flex items-center px-2 py-1">
      <div
        className="flex items-center gap-2"
        style={{ width: siderWidth ? `${siderWidth}%` : undefined }}
      >
        <Link to="/" className="flex items-center">
          <LogoIcon className="size-6 hover:opacity-80 transition-opacity" />
        </Link>
        <span className="font-medium text-sm truncate">{title}</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onToggleSider}
          aria-label={`${isSiderVisible ? "Show" : "Hide"} chat thread`}
        >
          {!isSiderVisible ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
          <span className="sr-only">Toggle sider</span>
        </Button>
      </div>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1">
          <TabsList>
            {tabs.map((tab) => (
              <Tooltip key={tab.value}>
                <TooltipTrigger asChild>
                  <TabsTrigger value={tab.value}>
                    <tab.icon />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>{tab.label}</TooltipContent>
              </Tooltip>
            ))}
          </TabsList>
        </div>
        <AddressBar />
        <div className="flex-1 flex items-center gap-2 justify-end">
          <Protect permission="sys_memberships:manage">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                clerk.openOrganizationProfile({
                  __experimental_startPath: "/organization-members",
                })
              }
            >
              <UserPlus />
              Invite
            </Button>
          </Protect>
          <Protect role="org:admin">
            <ShareButton />
          </Protect>
          {/* //   <div className="flex items-center gap-2">
              //     <RequireRole roles={["admin", "owner"]}>
              //       <ForkButton />
              //     </RequireRole>
              //     <RequireRole roles={["admin", "owner"]}>
              //       <InviteButton />
              //     </RequireRole>
              //     <ShareButton />
              //   </div> */}
        </div>
      </div>
    </header>
  );
}
