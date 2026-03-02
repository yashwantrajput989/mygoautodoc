import { cn } from "@/lib/utils";

type StatusType = "success" | "error" | "warning" | "info" | "pending" | "duplicate";

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  success: { label: "Success", className: "bg-success/10 text-success border border-success/20" },
  error: { label: "Failed", className: "bg-destructive/10 text-destructive border border-destructive/20" },
  warning: { label: "Warning", className: "bg-warning/10 text-warning border border-warning/20" },
  info: { label: "Pending", className: "bg-primary/10 text-primary border border-primary/20" },
  pending: { label: "Pending", className: "bg-primary/10 text-primary border border-primary/20" },
  duplicate: { label: "Duplicate", className: "bg-accent/10 text-accent border border-accent/20" },
};

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", config.className, className)}>
      {label || config.label}
    </span>
  );
}
