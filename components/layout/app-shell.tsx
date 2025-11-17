"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { NavLinks } from "@/components/layout/nav-links";
import { LogoutButton } from "@/components/layout/logout-button";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isNavOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  const pageTitle = getPageTitle(pathname);

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-50">
      <aside className="hidden w-64 flex-shrink-0 border-r border-zinc-200 bg-white px-4 py-6 dark:border-zinc-800 dark:bg-zinc-900 lg:block">
        <div className="flex items-center gap-2 px-2">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-400/40" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">
              Groundnut OS
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Founder Control Center</p>
          </div>
        </div>
        <NavLinks />
        <div className="mt-auto pt-6">
          <LogoutButton />
        </div>
        <div className="mt-4 rounded-lg bg-emerald-100/60 p-4 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
          <p>Today&apos;s Goal:</p>
          <p className="mt-1 text-sm font-semibold">Close 3 nurture leads and prep Batch 24B</p>
        </div>
      </aside>

      <div className="relative flex w-full flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 lg:px-8">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white p-2 text-zinc-500 shadow-sm transition hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 lg:hidden"
            onClick={() => setNavOpen((prev) => !prev)}
            aria-label="Toggle navigation"
          >
            <Menu size={20} />
          </button>
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-600 dark:text-emerald-300">
              Wood Pressed Groundnut Oil HQ
            </p>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden flex-col text-right text-xs lg:flex">
              <span className="font-medium text-zinc-500 dark:text-zinc-400">Batch in Press</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">24B — Oil yield target 182L</span>
            </div>
            <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200 lg:flex">
              SA
            </div>
          </div>

          <div
            className={cn(
              "fixed inset-x-0 top-14 z-30 flex flex-col gap-4 border-b border-zinc-200 bg-white px-4 pb-6 pt-4 shadow-lg transition lg:hidden",
              isNavOpen ? "translate-y-0" : "-translate-y-full",
            )}
          >
            <NavLinks onNavigate={() => setNavOpen(false)} />
            <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <LogoutButton />
            </div>
          </div>
        </header>

        <main className="flex-1 bg-zinc-50 px-4 pb-12 pt-6 dark:bg-zinc-950 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function getPageTitle(pathname: string) {
  const titles: Record<string, string> = {
    "/": "Command Center",
    "/inventory": "Inventory",
    "/production": "Production",
    "/orders/new": "Sales Entry",
    "/delivery": "Delivery Board",
    "/finance": "Finance Snapshot",
  };

  return titles[pathname] ?? "Groundnut OS";
}
