import type { MemberRole } from "@squashai/api";
import { authClient } from "./client";

export function RequireRole({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles: MemberRole[];
}) {
  const session = authClient.useSession();
  const org = authClient.useActiveOrganization();

  const role = org.data?.members.find(
    (m) => m.user.id === session.data?.user?.id
  )?.role as MemberRole | undefined;

  if (!role || !roles.includes(role)) return null;
  return children;
}
