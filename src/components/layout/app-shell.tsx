"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppIcon, type IconName } from "@/components/icons";
import { cn } from "@/lib/utils";

const navigation: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Проекты", icon: "project" },
  { href: "/chat", label: "Быстрый чат", icon: "chat" },
  { href: "/settings", label: "Настройки", icon: "settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:bg-background focus:p-panel-compact"
      >
        К содержимому
      </a>
      <aside className="flex shrink-0 flex-col border-b bg-sidebar p-panel-compact md:sticky md:top-0 md:h-dvh md:w-sidebar md:border-r md:border-b-0">
        <Link
          href="/"
          className="flex items-center gap-inline rounded-md p-panel-compact text-module"
          aria-label="Chat API — проекты"
        >
          <AppIcon name="chat" className="size-5" /> Chat API
        </Link>
        <nav aria-label="Основная навигация" className="flex gap-inline md:mt-group md:flex-col">
          {navigation.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/" || pathname.startsWith("/projects/")
                : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-control-h min-w-0 items-center gap-inline rounded-md px-panel-compact text-body-supporting transition-colors hover:bg-accent",
                  active
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "text-muted-foreground",
                )}
              >
                <AppIcon name={item.icon} className="hidden size-4 shrink-0 sm:block" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <p className="mt-auto hidden p-panel-compact text-caption text-muted-foreground md:block">
          Рабочее пространство Chat API
        </p>
      </aside>
      <main id="main" className="min-w-0 flex-1" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
