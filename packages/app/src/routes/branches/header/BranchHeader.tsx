import { RequireRole } from "@/auth/RequireRole";
import { Link } from "react-router";
import { InviteButton } from "./InviteButton";
import { ShareButton } from "./ShareButton";

export const BranchHeader = ({ title }: { title: string }) => (
  <header className="flex items-center justify-between p-2">
    <div className="flex items-center gap-2">
      <Link to="/" className="flex items-center">
        <img
          src="/preview/gradients/0.jpg"
          alt="Squash"
          className="size-6 hover:opacity-80 transition-opacity rounded-full"
        />
      </Link>
      <span className="font-medium text-sm">{title}</span>
    </div>

    <div className="flex items-center gap-2">
      <RequireRole roles={["admin", "owner"]}>
        <InviteButton />
      </RequireRole>
      <ShareButton />
    </div>
  </header>
);
