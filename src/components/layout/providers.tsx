"use client";

import { ThemeProvider } from "next-themes";
import { SWRConfig } from "swr";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SWRConfig value={{ shouldRetryOnError: false, revalidateOnFocus: true }}>
        {children}
      </SWRConfig>
    </ThemeProvider>
  );
}
