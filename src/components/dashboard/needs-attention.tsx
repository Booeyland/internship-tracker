"use client";

import * as React from "react";
import Link from "next/link";
import { BellRing, CheckCircle2, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Hint } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/common/empty-state";
import { CompanyAvatar } from "@/components/common/company-avatar";
import { TaskDialog, type TaskDraft } from "@/components/common/task-dialog";
import { useTracker } from "@/hooks/use-tracker";
import { cn } from "@/lib/utils";
import { todayIso } from "@/lib/dates";
import type { FollowUpSuggestion } from "@/types";

const SEVERITY_STYLES: Record<FollowUpSuggestion["severity"], string> = {
  overdue: "border-l-destructive",
  due: "border-l-amber-500",
  info: "border-l-border",
};

/**
 * Applications the tracker thinks need a nudge. Nothing is sent automatically —
 * each item can only become a task or be dismissed.
 */
export function NeedsAttention({
  suggestions,
  limit,
}: {
  suggestions: FollowUpSuggestion[];
  limit?: number;
}) {
  const { dismissSuggestion } = useTracker();
  const [draft, setDraft] = React.useState<Partial<TaskDraft> | null>(null);

  const visible = limit ? suggestions.slice(0, limit) : suggestions;

  if (suggestions.length === 0) {
    return (
      <EmptyState
        compact
        icon={CheckCircle2}
        title="Nothing needs attention"
        description="Every open application has either had a response or already has a task tracking it."
      />
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {visible.map((suggestion) => (
          <li
            key={suggestion.id}
            className={cn(
              "flex items-start gap-3 rounded-md border border-l-2 border-border bg-background p-2.5",
              SEVERITY_STYLES[suggestion.severity],
            )}
          >
            <CompanyAvatar company={suggestion.application.company} className="mt-0.5 size-6" />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Link
                  href={`/applications/${suggestion.applicationId}`}
                  className="truncate text-sm font-medium hover:underline"
                >
                  {suggestion.application.company.name}
                </Link>
                <Badge variant="muted">{suggestion.application.position}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{suggestion.detail}</p>
              <p className="mt-0.5 text-xs">
                <span className="text-muted-foreground">Suggested action: </span>
                <span className="font-medium">{suggestion.suggestedAction}</span>
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Hint label="Create a task for this">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() =>
                    setDraft({
                      title: `${suggestion.suggestedAction} — ${suggestion.application.company.name}`,
                      taskType: suggestion.suggestedTaskType,
                      priority: suggestion.priority,
                      applicationId: suggestion.applicationId,
                      dueDate: todayIso(),
                      autoSuggested: true,
                    })
                  }
                >
                  <Plus />
                  Task
                </Button>
              </Hint>
              <Hint label="Dismiss this suggestion">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Dismiss suggestion"
                  onClick={() => void dismissSuggestion(suggestion.applicationId, suggestion.reason)}
                >
                  <X />
                </Button>
              </Hint>
            </div>
          </li>
        ))}
      </ul>

      {limit && suggestions.length > limit && (
        <p className="mt-2 text-xs text-muted-foreground">
          <BellRing className="mr-1 inline size-3" />
          {suggestions.length - limit} more need attention —{" "}
          <Link href="/applications?view=need-follow-up" className="underline underline-offset-2">
            review them all
          </Link>
        </p>
      )}

      <TaskDialog
        open={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)}
        initial={draft ?? undefined}
        lockApplication
        title="Create follow-up task"
      />
    </>
  );
}
