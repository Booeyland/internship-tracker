"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, ExternalLink, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataGuard } from "@/components/common/data-guard";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { CompanyAvatar } from "@/components/common/company-avatar";
import { CompanyDialog } from "@/components/companies/company-dialog";
import { StatusDot } from "@/components/applications/status-badge";
import { useTracker } from "@/hooks/use-tracker";
import { normalizeUrl } from "@/lib/utils";

export default function CompaniesPage() {
  return (
    <DataGuard skeleton={<CompaniesSkeleton />}>
      <CompaniesScreen />
    </DataGuard>
  );
}

function CompaniesScreen() {
  const { dataset, applications } = useTracker();
  const [query, setQuery] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const rows = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return dataset.companies
      .map((company) => ({
        company,
        applications: applications.filter((application) => application.companyId === company.id),
        contacts: dataset.contacts.filter((contact) => contact.companyId === company.id),
      }))
      .filter(({ company }) => {
        if (!term) return true;
        return [company.name, company.industry, company.headquarters, company.notes]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      })
      .sort((a, b) => b.applications.length - a.applications.length || a.company.name.localeCompare(b.company.name));
  }, [dataset.companies, dataset.contacts, applications, query]);

  return (
    <>
      <PageHeader
        title="Companies"
        description={`${dataset.companies.length} companies in your search`}
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus />
            Add company
          </Button>
        }
      />

      <div className="border-b border-border px-4 py-2.5 lg:px-6">
        <div className="relative max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search companies…"
            className="h-8 pl-8"
          />
        </div>
      </div>

      <div className="p-4 lg:p-6">
        {rows.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={query ? "No companies match that search" : "No companies yet"}
            description={
              query
                ? "Try a different name or industry."
                : "Companies are created automatically when you add an application."
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map(({ company, applications: companyApplications, contacts }) => {
              const site = normalizeUrl(company.website);
              return (
                <Link
                  key={company.id}
                  href={`/companies/${company.id}`}
                  className="group flex flex-col gap-2.5 rounded-lg border border-border bg-card p-3 transition-colors hover:border-foreground/20 hover:bg-accent/30"
                >
                  <div className="flex items-start gap-2.5">
                    <CompanyAvatar company={company} className="size-9" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{company.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[company.industry, company.headquarters].filter(Boolean).join(" · ") ||
                          "No details yet"}
                      </p>
                    </div>
                    {site && (
                      <ExternalLink className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="muted">
                      {companyApplications.length} application
                      {companyApplications.length === 1 ? "" : "s"}
                    </Badge>
                    {contacts.length > 0 && (
                      <Badge variant="muted">
                        {contacts.length} contact{contacts.length === 1 ? "" : "s"}
                      </Badge>
                    )}
                  </div>

                  {companyApplications.length > 0 && (
                    <ul className="flex flex-col gap-1 border-t border-border pt-2">
                      {companyApplications.slice(0, 3).map((application) => (
                        <li
                          key={application.id}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground"
                        >
                          <StatusDot status={application.status} />
                          <span className="truncate">{application.position}</span>
                        </li>
                      ))}
                      {companyApplications.length > 3 && (
                        <li className="text-xs text-muted-foreground">
                          +{companyApplications.length - 3} more
                        </li>
                      )}
                    </ul>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <CompanyDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

function CompaniesSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <Skeleton className="h-8 w-36" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }).map((_, index) => (
          <Skeleton key={index} className="h-40" />
        ))}
      </div>
    </div>
  );
}
