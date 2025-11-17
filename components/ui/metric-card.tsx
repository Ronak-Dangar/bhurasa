import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  caption?: string;
  trend?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger";
}

const toneStyles: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  default: "text-zinc-900 dark:text-zinc-100",
  success: "text-emerald-600 dark:text-emerald-300",
  warning: "text-amber-600 dark:text-amber-300",
  danger: "text-rose-600 dark:text-rose-300",
};

export function MetricCard({ label, value, caption, trend, icon: Icon, tone = "default" }: MetricCardProps) {
  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className={cn("mt-2 text-3xl font-semibold", toneStyles[tone])}>{value}</p>
        </div>
        {Icon && (
          <span className="rounded-full bg-zinc-100 p-2 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
            <Icon size={20} />
          </span>
        )}
      </div>
      {(caption || trend) && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
          {caption && <span>{caption}</span>}
          {trend && <span className="font-medium text-emerald-600 dark:text-emerald-300">{trend}</span>}
        </div>
      )}
    </div>
  );
}
