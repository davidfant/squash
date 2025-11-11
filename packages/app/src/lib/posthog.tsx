import { useOrganization, useUser } from "@clerk/clerk-react";
import posthog from "posthog-js";
import { useEffect } from "react";

export function PosthogIdentify() {
  const auth = useUser();

  useEffect(() => {
    if (!auth.isLoaded) return;
    if (auth.user) {
      posthog.identify(auth.user.id, {
        email: auth.user.primaryEmailAddress,
        firstName: auth.user.firstName,
        lastName: auth.user.lastName,
      });
    } else {
      posthog.reset();
    }
  }, [auth.isLoaded, auth.user]);

  const org = useOrganization();
  useEffect(() => {
    if (org.isLoaded) return;
    if (org.organization) {
      posthog.group("organization", org.organization?.id, {
        name: org.organization?.name,
        role: org.membership?.role,
      });
    }
  }, [org.isLoaded, org.organization, org.membership]);

  return null;
}
