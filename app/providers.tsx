"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { Toaster } from "sonner";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);

  const isDesktopQuery = useMediaQuery({ query: "(min-width: 1024px)" });
  const isDesktop = hasMounted ? isDesktopQuery : true;

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position={isDesktop ? "top-center" : "top-right"}
        richColors
        closeButton
      />
    </QueryClientProvider>
  );
}
