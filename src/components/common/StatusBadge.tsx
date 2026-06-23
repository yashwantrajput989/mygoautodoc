import { cn } from "@/lib/utils";

type StatusType = "success" | "error" | "warning" | "info" | "pending" | "duplicate" | "in_progress" | "ready_to_send" | "failed" | "failed_parsing";

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  success: { label: "Success", className: "bg-success/10 text-success border border-success/20" },
  error: { label: "Push Failed", className: "bg-destructive/10 text-destructive border border-destructive/20" },
  failed: { label: "Push Failed", className: "bg-destructive/10 text-destructive border border-destructive/20" },
  warning: { label: "Warning", className: "bg-warning/10 text-warning border border-warning/20" },
  info: { label: "Pending", className: "bg-primary/10 text-primary border border-primary/20" },
  pending: { label: "Pending", className: "bg-primary/10 text-primary border border-primary/20" },
  duplicate: { label: "Duplicate", className: "bg-accent/10 text-accent border border-accent/20" },
  in_progress: { label: "In Progress", className: "bg-amber-500/10 text-amber-500 border border-amber-500/20" },
  ready_to_send: { label: "Ready to Send", className: "bg-blue-500/10 text-blue-500 border border-blue-500/20" },
  failed_parsing: { label: "Parsing Failed", className: "bg-orange-500/10 text-orange-500 border border-orange-500/20" },
};

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: String(status), className: "bg-muted text-muted-foreground border border-border" };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight", config.className, className)}>
      {label || config.label}
    </span>
  );
}
