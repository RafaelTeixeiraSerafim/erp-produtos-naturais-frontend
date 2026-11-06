"use client";
import "@/lib/auth-client";
import { AuthContext } from "./auth";
import type { Identity } from "@/lib/auth";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { client } from "@/generated/sdk/.kubb/client";
// Generated URLs already begin with /api. A blank base keeps calls on this origin.
client.setConfig({ baseURL: "", options: { timeout: 20000 } });
export function Providers({ children, identity = null }: { children: React.ReactNode; identity?: Identity | null }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: 30000,
            refetchOnWindowFocus: false,
          },
          mutations: { retry: false },
        },
      }),
  );
  useEffect(() => {
    if (!identity) return;
    const env = document.querySelector('meta[name="recovery-environment"]')?.getAttribute("content");
    const logout = (event: StorageEvent) => {
      if (event.key !== `vila:logout:${env}:${identity.id}`) return;
      window.dispatchEvent(new Event("auth-logout"));queryClient.clear();location.assign("/login");
    };
    window.addEventListener("storage", logout);
    return () => window.removeEventListener("storage", logout);
  }, [identity, queryClient]);
  return (
    <QueryClientProvider client={queryClient}><AuthContext.Provider value={identity}>{children}</AuthContext.Provider></QueryClientProvider>
  );
}
