import posthog from "posthog-js";
import { useEffect } from "react";
import { authClient } from "./client"; // your Better Auth client

export function PosthogIdentify() {
  const session = authClient.useSession();
  const userId = session.data?.user?.id;

  useEffect(() => {
    if (session.isPending) return;
    if (!userId) return;

    // Identify user once per login
    posthog.identify(userId, {
      email: session.data?.user?.email,
      name: session.data?.user?.name,
    });
  }, [session.isPending, session.data?.user?.id]);

  useEffect(() => {
    if (!session.isPending && !session.data) {
      posthog.reset();
    }
  }, [session.isPending, !!session.data]);

  const organization = authClient.useActiveOrganization();
  useEffect(() => {
    if (organization.isPending) return;

    const org = organization.data;
    if (!org) return;
    posthog.group("organization", org.id, { name: org.name });
  }, [organization.isPending, organization.data]);

  return null;
}
