"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, FileSearch, Plus, Search, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataGuard } from "@/components/common/data-guard";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { FilterMenu, type FilterOption } from "@/components/applications/filter-menu";
import {
  ApplicationsTable,
  ColumnMenu,
  DEFAULT_VISIBLE_COLUMNS,
} from "@/components/applications/applications-table";
import { useTracker } from "@/hooks/use-tracker";
import { useUi } from "@/hooks/use-ui";
import {
  EMPTY_FILTERS,
  countActiveFilters,
  distinctLocations,
  filterApplications,
  sortApplications,
} from "@/lib/selectors";
import { SAVED_VIEWS, applyViewPredicate, findView } from "@/lib/views";
import { STATUS_META } from "@/lib/status";
import { downloadCsv, toCsv } from "@/lib/utils";
import { formatDate } from "@/lib/dates";
import {
  APPLICATION_SOURCES,
  APPLICATION_STATUSES,
  INDUSTRIES,
  WORK_TYPES,
  type ApplicationFilters,
  type ApplicationStatus,
  type ApplicationWithRelations,
  type SortDirection,
} from "@/types";

export default function ApplicationsPage() {
  return (
    <DataGuard skeleton={<ApplicationsSkeleton />}>
      <React.Suspense fallback={<ApplicationsSkeleton />}>
        <ApplicationsScreen />
      </React.Suspense>
    </DataGuard>
  );
}

function ApplicationsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { applications, dataset, updateApplication, deleteApplication, duplicateApplication, bulkUpdateStatus, bulkDelete } =
    useTracker();
  const { openComposer } = useUi();

  const viewId = searchParams.get("view") ?? "all";
  const view = React.useMemo(() => findView(viewId), [viewId]);

  const [filters, setFilters] = React.useState<ApplicationFilters>(EMPTY_FILTERS);
  const [sortKey, setSortKey] = React.useState<string>(view.sortKey ?? "updatedAt");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(view.sortDirection ?? "desc");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = React.useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  const [pendingDelete, setPendingDelete] = React.useState<ApplicationWithRelations | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);

  // Switching saved view resets sort and filters to that view's own defaults.
  React.useEffect(() => {
    setFilters({ ...EMPTY_FILTERS, ...view.filters });
    setSortKey(view.sortKey ?? "updatedAt");
    setSortDirection(view.sortDirection ?? "desc");
    setSelectedIds([]);
  }, [view]);

  const rows = React.useMemo(() => {
    const scoped = applyViewPredicate(view, applications);
    return sortApplications(filterApplications(scoped, filters), sortKey, sortDirection);
  }, [applications, view, filters, sortKey, sortDirection]);

  // Drop selections for rows that filtering removed, so bulk actions stay honest.
  React.useEffect(() => {
    setSelectedIds((current) => {
      const visible = new Set(rows.map((row) => row.id));
      const next = current.filter((id) => visible.has(id));
      return next.length === current.length ? current : next;
    });
  }, [rows]);

  const options = React.useMemo(() => {
    const countBy = <T extends string>(accessor: (a: ApplicationWithRelations) => T | null) => {
      const counts = new Map<string, number>();
      for (const application of applications) {
        const value = accessor(application);
        if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      return counts;
    };

    const statusCounts = countBy((a) => a.status);
    const industryCounts = countBy((a) => a.industry);
    const sourceCounts = countBy((a) => a.source);
    const workTypeCounts = countBy((a) => a.workType);
    const companyCounts = countBy((a) => a.companyId);
    const locationCounts = countBy((a) => a.location);

    const toOptions = (values: readonly string[], counts: Map<string, number>): FilterOption[] =>
      values
        .filter((value) => counts.has(value))
        .map((value) => ({ value, label: value, count: counts.get(value) }));

    return {
      statuses: APPLICATION_STATUSES.filter((status) => statusCounts.has(status)).map((status) => ({
        value: status,
        label: status,
        color: STATUS_META[status].color,
        count: statusCounts.get(status),
      })),
      industries: toOptions(INDUSTRIES, industryCounts),
      sources: toOptions(APPLICATION_SOURCES, sourceCounts),
      workTypes: toOptions(WORK_TYPES, workTypeCounts),
      companies: dataset.companies
        .filter((company) => companyCounts.has(company.id))
        .map((company) => ({
          value: company.id,
          label: company.name,
          count: companyCounts.get(company.id),
        })),
      locations: distinctLocations(dataset.applications).map((location) => ({
        value: location,
        label: location,
        count: locationCounts.get(location),
      })),
    };
  }, [applications, dataset.companies, dataset.applications]);

  const activeFilterCount = countActiveFilters(filters);

  const onSort = (key: string) => {
    if (key === sortKey) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "company" || key === "position" ? "asc" : "desc");
    }
  };

  const exportCsv = () => {
    const headers = [
      "Company",
      "Position",
      "Industry",
      "Status",
      "Date applied",
      "Location",
      "Work type",
      "Source",
      "Compensation",
      "Contact",
      "Next action",
      "Deadline",
      "Resume version",
      "Referral",
      "Job posting URL",
      "Notes",
      "Last updated",
    ];
    const body = rows.map((application) => [
      application.company.name,
      application.position,
      application.industry ?? "",
      application.status,
      application.dateApplied ?? "",
      application.location ?? "",
      application.workType ?? "",
      application.source ?? "",
      application.compensation ?? "",
      application.recruiterName ?? application.contacts[0]?.name ?? "",
      application.nextAction ?? "",
      application.deadline ?? "",
      application.resumeVersion?.name ?? "",
      application.isReferral ? "Yes" : "No",
      application.jobPostingUrl ?? "",
      application.notes ?? "",
      formatDate(application.updatedAt),
    ]);
    downloadCsv(`internship-applications-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, body));
  };

  const isFiltered = activeFilterCount > 0 || filters.search.trim() !== "";

  return (
    <>
      <PageHeader
        title="Applications"
        description={`${rows.length} of ${applications.length} applications`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
              <Download />
              Export CSV
            </Button>
            <Button size="sm" onClick={() => openComposer()}>
              <Plus />
              Add application
            </Button>
          </>
        }
      >
        <div className="mt-3 flex flex-wrap items-center gap-1">
          {SAVED_VIEWS.map((savedView) => (
            <button
              key={savedView.id}
              type="button"
              onClick={() =>
                router.replace(
                  savedView.id === "all" ? "/applications" : `/applications?view=${savedView.id}`,
                  { scroll: false },
                )
              }
              className={
                savedView.id === view.id
                  ? "rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                  : "rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              }
            >
              {savedView.name}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5 lg:px-6">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search this table…"
            className="h-8 pl-8"
          />
        </div>

        <FilterMenu
          label="Status"
          options={options.statuses}
          selected={filters.statuses}
          onChange={(values) =>
            setFilters((current) => ({ ...current, statuses: values as ApplicationStatus[] }))
          }
        />
        <FilterMenu
          label="Industry"
          options={options.industries}
          selected={filters.industries}
          onChange={(values) =>
            setFilters((current) => ({ ...current, industries: values as ApplicationFilters["industries"] }))
          }
        />
        <FilterMenu
          label="Company"
          options={options.companies}
          selected={filters.companyIds}
          onChange={(values) => setFilters((current) => ({ ...current, companyIds: values }))}
        />
        <FilterMenu
          label="Location"
          options={options.locations}
          selected={filters.locations}
          onChange={(values) => setFilters((current) => ({ ...current, locations: values }))}
        />
        <FilterMenu
          label="Source"
          options={options.sources}
          selected={filters.sources}
          onChange={(values) =>
            setFilters((current) => ({ ...current, sources: values as ApplicationFilters["sources"] }))
          }
        />
        <FilterMenu
          label="Work type"
          options={options.workTypes}
          selected={filters.workTypes}
          onChange={(values) =>
            setFilters((current) => ({ ...current, workTypes: values as ApplicationFilters["workTypes"] }))
          }
        />

        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            aria-label="Applied on or after"
            value={filters.appliedAfter ?? ""}
            onChange={(event) =>
              setFilters((current) => ({ ...current, appliedAfter: event.target.value || null }))
            }
            className="h-8 w-[140px]"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            aria-label="Applied on or before"
            value={filters.appliedBefore ?? ""}
            onChange={(event) =>
              setFilters((current) => ({ ...current, appliedBefore: event.target.value || null }))
            }
            className="h-8 w-[140px]"
          />
        </div>

        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ ...EMPTY_FILTERS, ...view.filters })}
          >
            <X />
            Reset
          </Button>
        )}

        <div className="ml-auto">
          <ColumnMenu visible={visibleColumns} onChange={setVisibleColumns} />
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-accent/40 px-4 py-2 lg:px-6">
          <span className="text-sm font-medium">
            {selectedIds.length} selected
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Set status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
              <DropdownMenuLabel>Move {selectedIds.length} to…</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {APPLICATION_STATUSES.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onSelect={() => {
                    void bulkUpdateStatus(selectedIds, status);
                    setSelectedIds([]);
                  }}
                >
                  {status}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 />
            Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
            Clear selection
          </Button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="p-4 lg:p-6">
          <EmptyState
            icon={FileSearch}
            title={isFiltered ? "No applications match these filters" : "No applications yet"}
            description={
              isFiltered
                ? "Try clearing a filter or widening the date range."
                : "Add the first internship you are tracking. It takes about twenty seconds."
            }
            action={
              isFiltered ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({ ...EMPTY_FILTERS, ...view.filters })}
                >
                  Reset filters
                </Button>
              ) : (
                <Button size="sm" onClick={() => openComposer()}>
                  <Plus />
                  Add application
                </Button>
              )
            }
          />
        </div>
      ) : (
        <ApplicationsTable
          applications={rows}
          visibleColumns={visibleColumns}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={onSort}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onEdit={(application) => openComposer(application)}
          onDuplicate={(application) => void duplicateApplication(application.id)}
          onDelete={(application) => setPendingDelete(application)}
          onStatusChange={(application, status) => void updateApplication(application.id, { status })}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this application?"
        description={
          pendingDelete
            ? `${pendingDelete.company.name} — ${pendingDelete.position} and its interviews, tasks and timeline will be deleted permanently.`
            : undefined
        }
        onConfirm={async () => {
          if (pendingDelete) await deleteApplication(pendingDelete.id);
        }}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selectedIds.length} application${selectedIds.length === 1 ? "" : "s"}?`}
        description="Their interviews, tasks and timeline entries will be deleted too. This cannot be undone."
        onConfirm={async () => {
          await bulkDelete(selectedIds);
          setSelectedIds([]);
        }}
      />
    </>
  );
}

function ApplicationsSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4 lg:p-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-8 w-full max-w-2xl" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 10 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}
