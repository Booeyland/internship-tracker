"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Meter } from "@/components/analytics/charts";
import { EmptyState } from "@/components/common/empty-state";
import { BarChart3 } from "lucide-react";
import type { BreakdownRow } from "@/lib/analytics";

/**
 * Conversion table used for every "outcomes by X" breakdown. Percentages sit
 * next to the raw counts so a 100% rate off one application reads honestly.
 */
export function BreakdownTable({
  rows,
  dimensionLabel,
  emptyMessage = "Not enough data yet.",
}: {
  rows: BreakdownRow[];
  dimensionLabel: string;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <EmptyState compact icon={BarChart3} title="Nothing to compare yet" description={emptyMessage} />;
  }

  return (
    <div className="-mx-4 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">{dimensionLabel}</TableHead>
            <TableHead className="text-right">Applied</TableHead>
            <TableHead className="text-right">Responses</TableHead>
            <TableHead className="text-right">Interviews</TableHead>
            <TableHead className="text-right">Offers</TableHead>
            <TableHead className="w-[132px] pr-4">Interview rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell className="pl-4 font-medium">{row.key}</TableCell>
              <TableCell className="text-right tabular text-muted-foreground">
                {row.applications}
              </TableCell>
              <TableCell className="text-right tabular text-muted-foreground">
                {row.responses}
              </TableCell>
              <TableCell className="text-right tabular text-muted-foreground">
                {row.interviews}
              </TableCell>
              <TableCell className="text-right tabular text-muted-foreground">{row.offers}</TableCell>
              <TableCell className="pr-4">
                <div className="flex items-center gap-2">
                  <Meter value={row.interviews} max={Math.max(row.applications, 1)} className="w-16" />
                  <span className="w-11 shrink-0 text-right tabular text-xs text-muted-foreground">
                    {row.interviewRate}%
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="px-4 pt-2 text-xs text-muted-foreground">
        Bars show interviews as a share of applications in each {dimensionLabel.toLowerCase()} — read
        rates alongside the counts, since a small sample can swing a percentage.
      </p>
    </div>
  );
}
