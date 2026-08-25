import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  hero,
  className,
  style,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  color: string;
  hero?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-2xl p-5",
        hero ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground",
        className
      )}
      style={style}
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full"
        style={hero ? { backgroundColor: "rgba(255,255,255,0.2)" } : { backgroundColor: `${color}1A`, color }}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
      </span>
      <div className="mt-5">
        <p className={cn("text-xs font-medium", hero ? "text-primary-foreground/75" : "text-muted-foreground")}>
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
        {sub && (
          <p className={cn("mt-1 text-xs", hero ? "text-primary-foreground/60" : "text-muted-foreground")}>{sub}</p>
        )}
      </div>
    </div>
  );
}
