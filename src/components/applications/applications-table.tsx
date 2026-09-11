"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/applications/status-badge";
import { CompanyAvatar } from "@/components/common/company-avatar";
import { formatDate, relativeDay } from "@/lib/dates";
import { APPLICATION_STATUSES, type ApplicationStatus, type ApplicationWithRelations, type SortDirection } from "@/types";
import { cn, normalizeUrl } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Column definitions                                                        */
/* -------------------------------------------------------------------------- */

export interface ColumnDefinition {
  id: string;
  header: string;
  sortable: boolean;
  /** Hidden by default to keep the default table readable. */
  optional?: boolean;
  className?: string;
  render: (application: ApplicationWithRelations) => React.ReactNode;
}

const dash = <span className="text-muted-foreground">—</span>;

export const COLUMNS: ColumnDefinition[] = [
  {
    id: "company",
    header: "Company",
    sortable: true,
    className: "min-w-[180px]",
    render: (application) => (
      <Link
        href={`/applications/${application.id}`}
        className="flex items-center gap-2 font-medium hover:underline"
      >
        <CompanyAvatar company={application.company} className="size-6" />
        <span className="truncate">{application.company.name}</span>
      </Link>
    ),
  },
  {
    id: "position",
    header: "Position",
    sortable: true,
    className: "min-w-[240px] max-w-[320px]",
    render: (application) => (
      <Link
        href={`/applications/${application.id}`}
        className="block truncate text-muted-foreground hover:text-foreground hover:underline"
        title={application.position}
      >
        {application.position}
      </Link>
    ),
  },
  {
    id: "industry",
    header: "Industry",
    sortable: true,
    render: (application) =>
      application.industry ? (
        <span className="whitespace-nowrap text-muted-foreground">{application.industry}</span>
      ) : (
        dash
      ),
  },
  {
    id: "status",
    header: "Status",
    sortable: true,
    render: (application) => <StatusBadge status={application.status} />,
  },
  {
    id: "dateApplied",
    header: "Applied",
    sortable: true,
    render: (application) =>
      application.dateApplied ? (
        <span className="whitespace-nowrap text-muted-foreground" title={formatDate(application.dateApplied)}>
          {relativeDay(application.dateApplied)}
        </span>
      ) : (
        <span className="whitespace-nowrap text-muted-foreground">Not applied</span>
      ),
  },
  {
    id: "location",
    header: "Location",
    sortable: true,
    render: (application) =>
      application.location ? (
        <span className="whitespace-nowrap text-muted-foreground">{application.location}</span>
      ) : (
        dash
      ),
  },
  {
    id: "workType",
    header: "Work type",
    sortable: true,
    render: (application) =>
      application.workType ? (
        <span className="whitespace-nowrap text-muted-foreground">{application.workType}</span>
      ) : (
        dash
      ),
  },
  {
    id: "source",
    header: "Source",
    sortable: true,
    render: (application) =>
      application.source ? (
        <span className="whitespace-nowrap text-muted-foreground">{application.source}</span>
      ) : (
        dash
      ),
  },
  {
    id: "compensation",
    header: "Compensation",
    sortable: true,
    optional: true,
    render: (application) =>
      application.compensation ? (
        <span className="whitespace-nowrap text-muted-foreground">{application.compensation}</span>
      ) : (
        dash
      ),
  },
  {
    id: "contact",
    header: "Contact",
    sortable: true,
    render: (application) => {
      const name = application.recruiterName ?? application.contacts[0]?.name ?? null;
      return name ? <span className="whitespace-nowrap text-muted-foreground">{name}</span> : dash;
    },
  },
  {
    id: "nextAction",
    header: "Next action",
    sortable: true,
    className: "min-w-[180px] max-w-[240px]",
    render: (application) =>
      application.nextAction ? (
        <span className="block truncate text-muted-foreground" title={application.nextAction}>
          {application.nextAction}
        </span>
      ) : (
        dash
      ),
  },
  {
    id: "deadline",
    header: "Deadline",
    sortable: true,
    render: (application) =>
      application.deadline ? (
        <span className="whitespace-nowrap text-muted-foreground" title={formatDate(application.deadline)}>
          {relativeDay(application.deadline)}
        </span>
      ) : (
        dash
      ),
  },
  {
    id: "resume",
    header: "Resume",
    sortable: true,
    optional: true,
    render: (application) =>
      application.resumeVersion ? (
        <span className="whitespace-nowrap text-muted-foreground">{application.resumeVersion.name}</span>
      ) : (
        dash
      ),
  },
  {
    id: "updatedAt",
    header: "Last updated",
    sortable: true,
    render: (application) => (
      <span className="whitespace-nowrap text-muted-foreground" title={formatDate(application.updatedAt)}>
        {relativeDay(application.updatedAt)}
      </span>
    ),
  },
];

export const DEFAULT_VISIBLE_COLUMNS = COLUMNS.filter((column) => !column.optional).map((c) => c.id);

/* -------------------------------------------------------------------------- */
/*  Table                                                                     */
/* -------------------------------------------------------------------------- */

export function ApplicationsTable({
  applications,
  visibleColumns,
  sortKey,
  sortDirection,
  onSort,
  selectedIds,
  onSelectionChange,
  onEdit,
  onDuplicate,
  onDelete,
  onStatusChange,
}: {
  applications: ApplicationWithRelations[];
  visibleColumns: string[];
  sortKey: string;
  sortDirection: SortDirection;
  onSort: (key: string) => void;
  selectedIds: string[];
  /**
   * Takes an updater rather than a value so two toggles landing in the same
   * tick compose instead of overwriting each other.
   */
  onSelectionChange: (update: (current: string[]) => string[]) => void;
  onEdit: (application: ApplicationWithRelations) => void;
  onDuplicate: (application: ApplicationWithRelations) => void;
  onDelete: (application: ApplicationWithRelations) => void;
  onStatusChange: (application: ApplicationWithRelations, status: ApplicationStatus) => void;
}) {
  const columns = React.useMemo(
    () => COLUMNS.filter((column) => visibleColumns.includes(column.id)),
    [visibleColumns],
  );

  const allSelected = applications.length > 0 && selectedIds.length === applications.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const toggleAll = () => {
    onSelectionChange(() => (allSelected ? [] : applications.map((application) => application.id)));
  };

  const toggleOne = (id: string) => {
    onSelectionChange((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-9 pl-4">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={toggleAll}
                aria-label="Select all applications"
              />
            </TableHead>
            {columns.map((column) => (
              <TableHead key={column.id} className={column.className}>
                {column.sortable ? (
                  <button
                    type="button"
                    onClick={() => onSort(column.id)}
                    className="-ml-1 flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-accent hover:text-foreground"
                    aria-label={`Sort by ${column.header}`}
                  >
                    {column.header}
                    {sortKey === column.id ? (
                      sortDirection === "asc" ? (
                        <ChevronUp className="size-3" />
                      ) : (
                        <ChevronDown className="size-3" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 opacity-30" />
                    )}
                  </button>
                ) : (
                  column.header
                )}
              </TableHead>
            ))}
            <TableHead className="w-10 pr-4" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {applications.map((application) => {
            const selected = selectedIds.includes(application.id);
            const postingUrl = normalizeUrl(application.jobPostingUrl);

            return (
              <TableRow
                key={application.id}
                data-state={selected ? "selected" : undefined}
                className="group"
              >
                <TableCell className="pl-4">
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => toggleOne(application.id)}
                    aria-label={`Select ${application.company.name} ${application.position}`}
                  />
                </TableCell>

                {columns.map((column) => (
                  <TableCell key={column.id} className={cn("text-sm", column.className)}>
                    {column.render(application)}
                  </TableCell>
                ))}

                <TableCell className="pr-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                        aria-label={`Actions for ${application.company.name}`}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href={`/applications/${application.id}`}>Open details</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onEdit(application)}>
                        <Pencil /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Change status</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                          {APPLICATION_STATUSES.map((status) => (
                            <DropdownMenuItem
                              key={status}
                              onSelect={() => onStatusChange(application, status)}
                              className={cn(status === application.status && "font-medium")}
                            >
                              {status}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuItem onSelect={() => onDuplicate(application)}>
                        <Copy /> Duplicate
                      </DropdownMenuItem>
                      {postingUrl && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <a href={postingUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink /> Job posting
                            </a>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onSelect={() => onDelete(application)}>
                        <Trash2 /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Column visibility                                                         */
/* -------------------------------------------------------------------------- */

export function ColumnMenu({
  visible,
  onChange,
}: {
  visible: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Columns
          <ChevronDown className="opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-48 overflow-y-auto">
        <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {COLUMNS.map((column) => (
          <DropdownMenuItem
            key={column.id}
            onSelect={(event) => {
              event.preventDefault();
              onChange(
                visible.includes(column.id)
                  ? visible.filter((id) => id !== column.id)
                  : [...visible, column.id],
              );
            }}
          >
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
                visible.includes(column.id)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input",
              )}
            >
              {visible.includes(column.id) && <Check className="size-3" />}
            </span>
            {column.header}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
