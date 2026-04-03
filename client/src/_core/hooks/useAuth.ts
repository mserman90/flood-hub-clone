import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

// Guvenli getLoginUrl - OAuth env tanimli degilse (GitHub Pages) null doner
function safeGetLoginUrl(): string | null {
  try {
    const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
    if (!oauthPortalUrl) return null;
    const appId = import.meta.env.VITE_APP_ID || '';
    const redirectUri = `${window.location.origin}/api/oauth/callback`;
    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", btoa(redirectUri));
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch {
    return null;
  }
}

export function useAuth(options?: UseAuthOptions) {
  const {
    redirectOnUnauthenticated = false,
    redirectPath,
  } = options ?? {};

  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      console.error("[Auth] Logout error:", error);
    }
  }, [logoutMutation]);

  const user = useMemo(() => {
    if (meQuery.data === null) return null;
    if (!meQuery.data) return undefined;
    return meQuery.data;
  }, [meQuery.data]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading) return;
    if (user !== null && user !== undefined) return;
    if (meQuery.isError === false) return;

    const target = redirectPath ?? safeGetLoginUrl();
    if (target) {
      window.location.href = target;
    }
  }, [redirectOnUnauthenticated, redirectPath, meQuery.isLoading, meQuery.isError, user]);

  return {
    user,
    isLoading: meQuery.isLoading,
    error: meQuery.error,
    logout,
  };
}
