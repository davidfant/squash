import { Link } from "react-router";

export const BranchHeader = ({ title }: { title: string }) => (
  <header className="flex items-center gap-2 p-2">
    <Link to="/" className="flex items-center">
      <img
        src="/preview/gradients/0.jpg"
        alt="Squash"
        className="size-8 hover:opacity-80 transition-opacity rounded-full"
      />
    </Link>
    <span className="font-medium text-sm">{title}</span>
  </header>
);

// import { Button } from "@/components/ui/button";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Input } from "@/components/ui/input";
// import { Toggle } from "@/components/ui/toggle";
// import {
//   Tooltip,
//   TooltipContent,
//   TooltipTrigger,
// } from "@/components/ui/tooltip";
// import { cn } from "@/lib/utils";
// import {
//   ChevronDown,
//   Copy,
//   Eye,
//   Globe,
//   History,
//   Lock,
//   Settings,
//   Share,
//   Users,
// } from "lucide-react";
// import { Link } from "react-router";
// import { PreviewAddressBar } from "./PreviewAddressBar";

// interface BranchHeaderProps {
//   title: string;
//   isHistoryEnabled?: boolean;
//   onHistoryToggle?: (enabled: boolean) => void;
//   publicUrl?: string;
//   className?: string;
// }

// export function BranchHeader({
//   title,
//   isHistoryEnabled = false,
//   onHistoryToggle,
//   publicUrl = "https://myproject.com",
//   className,
// }: BranchHeaderProps) {
//   const copyPublicUrl = () => {
//     navigator.clipboard.writeText(publicUrl);
//   };

//   const isPublic = true;
//   return (
//     <header
//       className={cn("flex items-center justify-between pr-2 py-2", className)}
//     >
//       {/* Left Section - Wider like chat */}
//       <div className="pl-2 flex items-center gap-1 w-sm">
//         {/* App Logo */}
//         <Link to="/" className="flex items-center">
//           <img
//             src="/circle.svg"
//             alt="Logo"
//             className="size-8 hover:opacity-80 transition-opacity"
//           />
//         </Link>

//         {/* Project Name with Public/Private indicator and down arrow */}
//         <div className="flex-1">
//           <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//               <Button
//                 variant="ghost"
//                 className="flex items-center gap-2 px-3 hover:bg-muted"
//               >
//                 <span className="font-medium">{title}</span>
//                 {isPublic ? (
//                   <Globe className="size-4 text-muted-foreground" />
//                 ) : (
//                   <Lock className="size-4 text-muted-foreground" />
//                 )}
//                 <ChevronDown className="size-3 text-muted-foreground" />
//               </Button>
//             </DropdownMenuTrigger>
//             <DropdownMenuContent align="start" className="w-56">
//               <DropdownMenuItem>
//                 <Settings className="size-4 mr-2" />
//                 Project Settings
//               </DropdownMenuItem>
//               <DropdownMenuItem>
//                 <Users className="size-4 mr-2" />
//                 Manage Access
//               </DropdownMenuItem>
//               <DropdownMenuSeparator />
//               <DropdownMenuItem>
//                 <Eye className="size-4 mr-2" />
//                 {isPublic ? "Make Private" : "Make Public"}
//               </DropdownMenuItem>
//             </DropdownMenuContent>
//           </DropdownMenu>
//         </div>

//         <Tooltip>
//           <TooltipTrigger asChild>
//             <Toggle
//               pressed={isHistoryEnabled}
//               onPressedChange={onHistoryToggle}
//               variant="default"
//               size="sm"
//               className="relative z-10"
//             >
//               <History className="h-4 w-4" />
//             </Toggle>
//           </TooltipTrigger>
//           <TooltipContent>
//             {isHistoryEnabled ? "Hide History" : "See History"}
//           </TooltipContent>
//         </Tooltip>

//         {/* Sidebar Toggle */}
//         {/* <Tooltip>
//           <TooltipTrigger asChild>
//             <SidebarTrigger />
//           </TooltipTrigger>
//           <TooltipContent>Toggle Chat</TooltipContent>
//         </Tooltip> */}
//       </div>

//       {/* Center Section - Action Buttons and URL Bar */}
//       <div className="flex items-center gap-1 flex-1">
//         {/* URL Bar with Screen Size Toggle - Combined in bordered container */}
//         <div className="flex-1 flex justify-center">
//           <PreviewAddressBar />
//         </div>
//       </div>

//       {/* Right Section */}
//       <div className="flex items-center gap-2">
//         {/* User Avatar */}
//         {/* <Avatar className="size-8">
//           <AvatarImage src={userAvatar} alt={userName} />
//           <AvatarFallback>
//             {userName
//               .split(" ")
//               .map((n) => n[0])
//               .join("")
//               .toUpperCase()}
//           </AvatarFallback>
//         </Avatar> */}

//         {/* Invite Button */}
//         {/* <Tooltip>
//           <TooltipTrigger asChild>
//             <Button
//               variant="outline"
//               size="sm"
//               className="rounded-full"
//               onClick={onInvite}
//             >
//               <UserPlus className="size-4" />
//               Invite
//             </Button>
//           </TooltipTrigger>
//           <TooltipContent>Invite Collaborators</TooltipContent>
//         </Tooltip> */}

//         {/* Upgrade Button */}
//         {/* <Tooltip>
//           <TooltipTrigger asChild>
//             <Button
//               variant="outline"
//               size="sm"
//               onClick={onUpgrade}
//               className="text-amber-600 border-amber-200 hover:bg-amber-50"
//             >
//               <Crown className="size-4" />
//               Upgrade
//             </Button>
//           </TooltipTrigger>
//           <TooltipContent>Upgrade Plan</TooltipContent>
//         </Tooltip> */}

//         {/* Publish Button */}
//         <DropdownMenu>
//           <DropdownMenuTrigger asChild>
//             <Button variant="default">
//               <Share />
//               Share
//             </Button>
//           </DropdownMenuTrigger>
//           <DropdownMenuContent align="end" className="w-64">
//             <div className="p-3">
//               <div className="text-sm font-medium mb-2">Public URL</div>
//               <div className="flex items-center gap-2">
//                 <Input value={publicUrl} readOnly className="text-xs" />
//                 <Button size="sm" variant="outline" onClick={copyPublicUrl}>
//                   <Copy className="size-3" />
//                 </Button>
//               </div>
//             </div>
//             <DropdownMenuSeparator />
//             <DropdownMenuItem>
//               <Globe className="size-4 mr-2" />
//               Visit Published Site
//             </DropdownMenuItem>
//             <DropdownMenuItem>
//               <Settings className="size-4 mr-2" />
//               Publish Settings
//             </DropdownMenuItem>
//           </DropdownMenuContent>
//         </DropdownMenu>
//       </div>
//     </header>
//   );
// }
