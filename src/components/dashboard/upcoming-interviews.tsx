"use client";

import Link from "next/link";
import { CalendarClock, ExternalLink, Video } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { CompanyAvatar } from "@/components/common/company-avatar";
import { formatDate, formatTime, relativeDay } from "@/lib/dates";
import { normalizeUrl } from "@/lib/utils";
import type { ApplicationWithRelations, Interview } from "@/types";

export interface UpcomingInterview {
  interview: Interview;
  application: ApplicationWithRelations;
}

export function UpcomingInterviews({ items }: { items: UpcomingInterview[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        compact
        icon={CalendarClock}
        title="No interviews scheduled"
        description="Interviews you add to an application show up here and on the calendar."
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {items.map(({ interview, application }) => {
        const link = normalizeUrl(interview.meetingLink);
        return (
          <li key={interview.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
            <CompanyAvatar company={application.company} className="mt-0.5" />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Link
                  href={`/applications/${application.id}`}
                  className="truncate text-sm font-medium hover:underline"
                >
                  {application.company.name}
                </Link>
                <Badge variant="outline">{interview.interviewType}</Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">{application.position}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{relativeDay(interview.scheduledAt)}</span>
                {" · "}
                {formatDate(interview.scheduledAt)} at {formatTime(interview.scheduledAt)}
                {interview.interviewerName ? ` · ${interview.interviewerName}` : ""}
                {interview.interviewerTitle ? ` (${interview.interviewerTitle})` : ""}
              </p>
            </div>

            {link && (
              <Button asChild variant="outline" size="xs" className="shrink-0">
                <a href={link} target="_blank" rel="noopener noreferrer">
                  <Video />
                  Join
                  <ExternalLink className="size-3" />
                </a>
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
