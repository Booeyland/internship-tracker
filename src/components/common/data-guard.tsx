"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTracker } from "@/hooks/use-tracker";
import { cn } from "@/lib/utils";

/**
 * Wraps a screen so every page gets consistent loading and error treatment.
 * `skeleton` lets each page render a shape that matches its own layout.
 */
export function DataGuard({
  children,
  skeleton,
}: {
  children: React.ReactNode;
  skeleton?: React.ReactNode;
}) {
  const { state, error, refresh } = useTracker();

  if (state === "loading") {
    return <>{skeleton ?? <DefaultSkeleton />}</>;
  }

  if (state === "error") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" />
        </span>
        <div>
          <p className="text-sm font-medium">Could not load your tracker</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">{error}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void refresh()}>
          <RefreshCw />
          Try again
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

function DefaultSkeleton() {
  return (
    <div className="space-y-4 p-4 lg:p-6">
      <Skeleton className="h-7 w-52" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

/** Repeated skeleton rows for table-shaped screens. */
export function TableSkeleton({ rows = 8, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-9 w-full" />
      ))}
    </div>
  );
}
