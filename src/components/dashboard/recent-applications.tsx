"use client";

import Link from "next/link";
import { FileSearch } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/applications/status-badge";
import { CompanyAvatar } from "@/components/common/company-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { formatDate, relativeDay } from "@/lib/dates";
import type { ApplicationWithRelations } from "@/types";

export function RecentApplications({
  applications,
  onAdd,
}: {
  applications: ApplicationWithRelations[];
  onAdd?: () => void;
}) {
  if (applications.length === 0) {
    return (
      <EmptyState
        compact
        icon={FileSearch}
        title="No applications yet"
        description="Add the first role you are tracking and it will show up here."
        action={
          onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="text-xs font-medium text-foreground underline underline-offset-4"
            >
              Add an application
            </button>
          )
        }
      />
    );
  }

  return (
    <div className="-mx-4 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Company</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Date applied</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="pr-4">Next action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((application) => (
            <TableRow key={application.id} className="border-b-0">
              <TableCell className="pl-4">
                <Link
                  href={`/applications/${application.id}`}
                  className="flex items-center gap-2 font-medium hover:underline"
                >
                  <CompanyAvatar company={application.company} className="size-6" />
                  <span className="truncate">{application.company.name}</span>
                </Link>
              </TableCell>
              <TableCell className="max-w-[260px] truncate text-muted-foreground">
                {application.position}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {application.dateApplied ? (
                  <span title={formatDate(application.dateApplied)}>
                    {relativeDay(application.dateApplied)}
                  </span>
                ) : (
                  "Not applied"
                )}
              </TableCell>
              <TableCell>
                <StatusBadge status={application.status} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {application.location ?? "—"}
              </TableCell>
              <TableCell className="max-w-[220px] truncate pr-4 text-muted-foreground">
                {application.nextAction ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
