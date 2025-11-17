"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon, Home, PackageSearch, Factory, ClipboardPlus, Navigation2, PiggyBank, Users, Droplet } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

const links: NavLink[] = [
  { label: "Command Center", href: "/", icon: Home },
  { label: "Customers", href: "/dashboard/customers", icon: Users },
  { label: "Inventory", href: "/inventory", icon: PackageSearch },
  { label: "Production", href: "/production", icon: Factory },
  { label: "Bottling", href: "/bottling", icon: Droplet },
  { label: "New Order", href: "/orders/new", icon: ClipboardPlus },
  { label: "Delivery Board", href: "/delivery", icon: Navigation2 },
  { label: "Finance", href: "/finance", icon: PiggyBank },
];

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="mt-6 space-y-1">
      {links.map((link) => {
        const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
              isActive
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
            )}
          >
            <Icon size={18} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
