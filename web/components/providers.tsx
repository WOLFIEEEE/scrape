"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { CommandPalette } from "@/components/command-palette";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5_000,
            refetchOnWindowFocus: false,
            retry: 0,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      {children}
      <CommandPalette />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
