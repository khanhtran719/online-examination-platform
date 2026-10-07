import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { RouterProvider } from "react-router";
import { ChromeProvider } from "./chrome";
import { MemoryProvider } from "./memory";
import { router } from "./router";
import { RuntimeProvider, type RuntimeValue } from "./runtime";
import { SessionProvider } from "./session";

export function App({ runtime, headerSlot }: { runtime: RuntimeValue; headerSlot?: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            staleTime: 15_000,
          },
        },
      }),
  );
  return (
    <RuntimeProvider value={runtime}>
      <QueryClientProvider client={client}>
        <MemoryProvider>
          <SessionProvider>
            <ChromeProvider value={headerSlot ?? null}>
              <RouterProvider router={router} />
            </ChromeProvider>
          </SessionProvider>
        </MemoryProvider>
      </QueryClientProvider>
    </RuntimeProvider>
  );
}
