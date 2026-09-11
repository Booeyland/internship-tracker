"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  ExternalLink,
  Globe,
  Linkedin,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataGuard } from "@/components/common/data-guard";
import { Section } from "@/components/common/section";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { CompanyAvatar } from "@/components/common/company-avatar";
import { StatusBadge } from "@/components/applications/status-badge";
import { NotesEditor } from "@/components/applications/notes-editor";
import { CompanyDialog } from "@/components/companies/company-dialog";
import { ContactDialog } from "@/components/contacts/contact-dialog";
import { useTracker } from "@/hooks/use-tracker";
import { appliedPhrase, formatDate } from "@/lib/dates";
import { normalizeUrl } from "@/lib/utils";
import { useUi } from "@/hooks/use-ui";

export default function CompanyDetailPage() {
  return (
    <DataGuard skeleton={<CompanySkeleton />}>
      <CompanyDetail />
    </DataGuard>
  );
}

function CompanyDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { dataset, applications, updateCompany, deleteCompany } = useTracker();
  const { openComposer } = useUi();
  const [editOpen, setEditOpen] = React.useState(false);
  const [contactOpen, setContactOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const company = dataset.companies.find((item) => item.id === params.id);

  const companyApplications = React.useMemo(
    () => applications.filter((application) => application.companyId === params.id),
    [applications, params.id],
  );
  const contacts = React.useMemo(
    () => dataset.contacts.filter((contact) => contact.companyId === params.id),
    [dataset.contacts, params.id],
  );

  if (!company) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Building2}
          title="Company not found"
          description="It may have been deleted, or the link is out of date."
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/companies">
                <ArrowLeft />
                Back to companies
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const site = normalizeUrl(company.website);
  const careers = normalizeUrl(company.careersUrl);

  return (
    <>
      <div className="border-b border-border px-4 py-3 lg:px-6">
        <Button asChild variant="ghost" size="xs" className="-ml-2 mb-2 text-muted-foreground">
          <Link href="/companies">
            <ArrowLeft />
            Companies
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <CompanyAvatar company={company} className="size-11" />
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight">{company.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {company.industry && (
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="size-3" />
                    {company.industry}
                  </span>
                )}
                {company.headquarters && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" />
                    {company.headquarters}
                  </span>
                )}
                {site && (
                  <a
                    href={site}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
                  >
                    <Globe className="size-3" />
                    Website
                  </a>
                )}
                {careers && (
                  <a
                    href={careers}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
                  >
                    <ExternalLink className="size-3" />
                    Careers page
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil />
              Edit
            </Button>
            <Button size="sm" onClick={() => openComposer()}>
              <Plus />
              Add application
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Delete company"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-3 lg:p-6">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Section
            title="Applications"
            description={`${companyApplications.length} role${companyApplications.length === 1 ? "" : "s"} at ${company.name}`}
          >
            {companyApplications.length === 0 ? (
              <EmptyState
                compact
                icon={Briefcase}
                title="No applications yet"
                description={`Add a role at ${company.name} and it will be listed here.`}
                action={
                  <Button size="xs" variant="outline" onClick={() => openComposer()}>
                    <Plus />
                    Add application
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {companyApplications.map((application) => (
                  <li key={application.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={`/applications/${application.id}`}
                        className="min-w-0 truncate text-sm font-medium hover:underline"
                      >
                        {application.position}
                      </Link>
                      <StatusBadge status={application.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[
                        application.industry,
                        application.location,
                        application.dateApplied
                          ? appliedPhrase(application.dateApplied)
                          : "Not applied yet",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Notes" description="What you know about recruiting here.">
            <NotesEditor
              value={company.notes}
              rows={6}
              placeholder="Recruiting timeline, interview format, who you know there…"
              onSave={(notes) => updateCompany(company.id, { notes })}
            />
          </Section>
        </div>

        <div className="flex flex-col gap-4">
          <Section
            title="Contacts"
            description={`${contacts.length} at ${company.name}`}
            actions={
              <Button variant="outline" size="xs" onClick={() => setContactOpen(true)}>
                <Plus />
                Add
              </Button>
            }
          >
            {contacts.length === 0 ? (
              <EmptyState
                compact
                icon={Users}
                title="No contacts yet"
                description="Add recruiters, alumni or interviewers you have spoken with."
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {contacts.map((contact) => {
                  const profile = normalizeUrl(contact.linkedinUrl);
                  return (
                    <li key={contact.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{contact.name}</span>
                        <Badge variant="muted">{contact.relationship}</Badge>
                      </div>
                      {contact.jobTitle && (
                        <p className="text-xs text-muted-foreground">{contact.jobTitle}</p>
                      )}
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="inline-flex items-center gap-1 underline underline-offset-2"
                          >
                            <Mail className="size-3" />
                            Email
                          </a>
                        )}
                        {profile && (
                          <a
                            href={profile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 underline underline-offset-2"
                          >
                            <Linkedin className="size-3" />
                            LinkedIn
                          </a>
                        )}
                        {contact.lastContactDate && (
                          <span>Last contact {formatDate(contact.lastContactDate)}</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>
      </div>

      <CompanyDialog open={editOpen} onOpenChange={setEditOpen} company={company} />
      <ContactDialog
        open={contactOpen}
        onOpenChange={setContactOpen}
        defaultCompanyId={company.id}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${company.name}?`}
        description={
          companyApplications.length > 0
            ? `This will also delete ${companyApplications.length} application${companyApplications.length === 1 ? "" : "s"} at this company, along with their interviews, tasks and timeline.`
            : "This company will be removed permanently."
        }
        onConfirm={async () => {
          await deleteCompany(company.id);
          router.push("/companies");
        }}
      />
    </>
  );
}

function CompanySkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <Skeleton className="h-16 w-full max-w-md" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
