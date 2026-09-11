"use client";

import * as React from "react";
import Link from "next/link";
import { MoreHorizontal, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { useTracker } from "@/hooks/use-tracker";
import { duePhrase, isOverdue } from "@/lib/dates";
import { PRIORITY_META } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

/**
 * Renders tasks with a working completion checkbox, priority, due-date phrasing
 * and (optionally) the application each task belongs to.
 */
export function TaskList({
  tasks,
  showApplication = false,
  emptyMessage = "No tasks yet.",
  className,
}: {
  tasks: Task[];
  showApplication?: boolean;
  emptyMessage?: string;
  className?: string;
}) {
  const { toggleTask, deleteTask, applicationById } = useTracker();
  const [pendingDelete, setPendingDelete] = React.useState<Task | null>(null);

  if (tasks.length === 0) {
    return <p className="px-1 py-4 text-center text-xs text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <>
      <ul className={cn("flex flex-col divide-y divide-border", className)}>
        {tasks.map((task) => {
          const application = task.applicationId ? applicationById.get(task.applicationId) : undefined;
          const overdue = !task.completed && isOverdue(task.dueDate);

          return (
            <li key={task.id} className="group flex items-start gap-2.5 py-2">
              <Checkbox
                className="mt-0.5"
                checked={task.completed}
                onCheckedChange={(checked) => void toggleTask(task.id, checked === true)}
                aria-label={task.completed ? `Mark ${task.title} incomplete` : `Complete ${task.title}`}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm leading-snug",
                    task.completed && "text-muted-foreground line-through",
                  )}
                >
                  {task.title}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  {showApplication && application && (
                    <Link
                      href={`/applications/${application.id}`}
                      className="truncate font-medium text-foreground hover:underline"
                    >
                      {application.company.name}
                    </Link>
                  )}
                  {showApplication && application && <span aria-hidden>·</span>}
                  {showApplication && application && (
                    <span className="truncate">{application.position}</span>
                  )}
                  {showApplication && application && <span aria-hidden>·</span>}
                  <span>{task.taskType}</span>
                  <span aria-hidden>·</span>
                  <span className={cn(overdue && "font-medium text-destructive")}>
                    {task.completed ? "Completed" : duePhrase(task.dueDate)}
                  </span>
                </div>
                {task.notes && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.notes}</p>
                )}
              </div>

              <Badge variant="secondary" className={cn("mt-0.5 shrink-0", PRIORITY_META[task.priority].badge)}>
                {task.priority}
              </Badge>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                    aria-label={`Actions for ${task.title}`}
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {application && (
                    <DropdownMenuItem asChild>
                      <Link href={`/applications/${application.id}`}>Open application</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem destructive onSelect={() => setPendingDelete(task)}>
                    <Trash2 /> Delete task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this task?"
        description={
          pendingDelete ? `“${pendingDelete.title}” will be removed permanently.` : undefined
        }
        onConfirm={async () => {
          if (pendingDelete) await deleteTask(pendingDelete.id);
        }}
      />
    </>
  );
}
