import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  try {
    if (!(error instanceof TRPCClientError)) return;
    if (typeof window === "undefined") return;

    const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
    if (!isUnauthorized) return;

    // VITE_OAUTH_PORTAL_URL tanimli degilse (GitHub Pages) sessizce cik
    const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
    if (!oauthPortalUrl) return;

    const redirectUri = `${window.location.origin}/api/oauth/callback`;
    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", import.meta.env.VITE_APP_ID || '');
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", btoa(redirectUri));
    url.searchParams.set("type", "signIn");
    window.location.href = url.toString();
  } catch (e) {
    // OAuth env degiskenleri eksik, sessizce atla
    console.warn('[Auth] OAuth redirect atlanamadi:', e);
  }
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

// GitHub Pages'te tam origin URL kullan
const API_BASE_URL = typeof window !== 'undefined'
  ? `${window.location.origin}/api/trpc`
  : '/api/trpc';

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: API_BASE_URL,
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
