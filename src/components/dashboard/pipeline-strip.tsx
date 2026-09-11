"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { StageCount } from "@/lib/analytics";

/**
 * The dashboard's at-a-glance funnel: how many applications sit at each stage
 * right now. Each step links into the pipeline board filtered to that stage.
 */
export function PipelineStrip({ stages }: { stages: StageCount[] }) {
  const max = Math.max(...stages.map((stage) => stage.count), 1);

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-stretch">
      {stages.map((stage, index) => (
        <div key={stage.stage} className="flex min-w-0 flex-1 items-center gap-1.5">
          <Link
            href={`/pipeline?stage=${encodeURIComponent(stage.stage)}`}
            className={cn(
              "group flex min-w-0 flex-1 flex-col gap-1.5 rounded-md border border-border p-2.5 transition-colors hover:border-foreground/20 hover:bg-accent/40",
              stage.count === 0 && "opacity-60",
            )}
          >
            <span className="truncate text-xs text-muted-foreground">{stage.stage}</span>
            <span className="text-xl font-semibold leading-none tabular">{stage.count}</span>
            <span className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${Math.round((stage.count / max) * 100)}%`,
                  backgroundColor: "var(--viz-series-1)",
                }}
              />
            </span>
          </Link>
          {index < stages.length - 1 && (
            <ChevronRight
              className="hidden size-3.5 shrink-0 text-muted-foreground sm:block"
              aria-hidden
            />
          )}
        </div>
      ))}
    </div>
  );
}
