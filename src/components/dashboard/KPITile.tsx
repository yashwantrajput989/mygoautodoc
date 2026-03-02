import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

interface KPITileProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  status?: "success" | "warning" | "error" | "info";
  icon?: ReactNode;
}

export function KPITile({ title, value, unit, trend, trendValue, status, icon }: KPITileProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="fiori-kpi-tile animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <span className="fiori-label">{title}</span>
        {icon && (
          <div className={cn(
            "w-8 h-8 rounded flex items-center justify-center",
            status === "success" && "bg-success/10 text-success",
            status === "warning" && "bg-warning/10 text-warning",
            status === "error" && "bg-destructive/10 text-destructive",
            status === "info" && "bg-primary/10 text-primary",
            !status && "bg-muted text-muted-foreground"
          )}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold text-foreground">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {trendValue && (
        <div className={cn("flex items-center gap-1 mt-2 text-xs", trendColor)}>
          <TrendIcon className="h-3 w-3" />
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}
