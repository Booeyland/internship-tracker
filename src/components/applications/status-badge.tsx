import { Badge } from "@/components/ui/badge";
import { STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/types";

export function StatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn(STATUS_META[status].badge, className)}>
      {status}
    </Badge>
  );
}

/** Small colour dot, for dense rows where a full badge would be too heavy. */
export function StatusDot({ status, className }: { status: ApplicationStatus; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: STATUS_META[status].color }}
    />
  );
}
