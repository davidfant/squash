import { useAuth } from "@clerk/clerk-react";
import { useMemo } from "react";
import { api, useQuery } from "@/hooks/api";

type SessionResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  session: {
    userId: string;
    activeOrganizationId: string | null;
  };
};

function useSession() {
  const auth = useAuth();
  const query = useQuery(api.auth.me.$get, {
    params: {},
    enabled: auth.isLoaded && auth.isSignedIn,
    retry: false,
  });

  const isPending =
    !auth.isLoaded || (auth.isSignedIn ? query.isPending || query.isFetching : false);

  const data = useMemo<SessionResponse | undefined>(
    () => (auth.isSignedIn ? query.data : undefined),
    [auth.isSignedIn, query.data]
  );

  return {
    ...query,
    data,
    isPending,
  };
}

function useActiveOrganization() {
  const auth = useAuth();
  const query = useQuery(api.organizations.active.$get, {
    params: {},
    enabled: auth.isLoaded && auth.isSignedIn,
    retry: false,
  });

  const data = useMemo(
    () => query.data?.organization,
    [query.data?.organization]
  );

  const isPending =
    !auth.isLoaded || (auth.isSignedIn ? query.isPending || query.isFetching : false);

  return {
    ...query,
    data,
    isPending,
  };
}

function useListOrganizations() {
  const auth = useAuth();
  const query = useQuery(api.organizations.$get, {
    params: {},
    enabled: auth.isLoaded && auth.isSignedIn,
    retry: false,
  });

  const organizations = useMemo(
    () => query.data?.organizations ?? [],
    [query.data?.organizations]
  );

  const isPending =
    !auth.isLoaded || (auth.isSignedIn ? query.isPending || query.isFetching : false);

  return {
    ...query,
    data: organizations,
    isPending,
  };
}

async function createOrganization(input: {
  name: string;
  slug: string;
  logo?: string;
}) {
  const res = await api.organizations.$post({ json: input });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message =
      typeof errorBody?.error === "string"
        ? errorBody.error
        : "Failed to create organization";
    throw new Error(message);
  }
  return res.json() as Promise<{
    organization: { id: string; name: string; slug: string; logo: string | null };
  }>;
}

async function setActiveOrganization(input: { organizationId: string }) {
  const res = await api.organizations.active.$patch({ json: input });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message =
      typeof errorBody?.error === "string"
        ? errorBody.error
        : "Failed to switch organization";
    throw new Error(message);
  }
  return res.json() as Promise<{ success: boolean }>;
}

export const authClient = {
  useSession,
  useActiveOrganization,
  useListOrganizations,
  organization: {
    create: createOrganization,
    setActive: setActiveOrganization,
  },
};
