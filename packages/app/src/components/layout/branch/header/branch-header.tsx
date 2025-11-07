import { LogoIcon } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { TabsList, TabsTrigger, useActiveTab } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Protect, useClerk } from "@clerk/clerk-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AppWindowIcon,
  CodeXmlIcon,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Link } from "react-router";
import { AddressBar } from "./address-bar";
import { PublishButton } from "./publish-button";

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
  const activeTab = useActiveTab();
  return (
    <header className="flex items-center py-1">
      <div
        className="flex items-center gap-2 px-2"
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
      <div className="flex-1 flex items-center gap-2 pr-2">
        <div className="flex-1">
          <TabsList>
            {tabs.map((tab) => (
              <Tooltip key={tab.value}>
                <TooltipTrigger asChild>
                  <TabsTrigger value={tab.value}>
                    <div className="flex items-center gap-1">
                      <tab.icon />
                      <AnimatePresence mode="wait">
                        {activeTab === tab.value && (
                          <motion.span
                            key={tab.value}
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden whitespace-nowrap"
                          >
                            {tab.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
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
              {/* <UserPlus /> */}
              Invite
            </Button>
          </Protect>
          <Protect role="org:admin">
            <PublishButton />
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
