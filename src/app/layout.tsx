import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { Providers } from "@/components/layout/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Chat API", template: "%s · Chat API" },
  description: "Проекты, чат и история запросов Chat API",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
