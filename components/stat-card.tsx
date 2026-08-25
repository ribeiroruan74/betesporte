import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta";

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  hero,
  delta,
  className,
  style,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  color: string;
  hero?: boolean;
  /** variação vs. o mesmo dia da semana passada, em pontos — omitido quando não há dado de comparação */
  delta?: number;
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
      <div className="flex items-center justify-between">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={hero ? { backgroundColor: "rgba(255,255,255,0.2)" } : { backgroundColor: `${color}1A`, color }}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
        </span>
        {delta !== undefined && (
          <Delta value={delta} variant="badge" className={hero ? "bg-white/20 text-white" : undefined}>
            <DeltaIcon variant="trend" />
            <DeltaValue precision={0} suffix="" />
          </Delta>
        )}
      </div>
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
