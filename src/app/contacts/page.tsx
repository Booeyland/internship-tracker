"use client";

import * as React from "react";
import Link from "next/link";
import { Linkedin, Mail, MoreHorizontal, Pencil, Phone, Plus, Search, Trash2, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataGuard } from "@/components/common/data-guard";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { FilterMenu } from "@/components/applications/filter-menu";
import { ContactDialog } from "@/components/contacts/contact-dialog";
import { useTracker } from "@/hooks/use-tracker";
import { formatDate, isOverdue, relativeDay } from "@/lib/dates";
import { cn, normalizeUrl } from "@/lib/utils";
import { RELATIONSHIP_TYPES, type Contact, type RelationshipType } from "@/types";

export default function ContactsPage() {
  return (
    <DataGuard skeleton={<ContactsSkeleton />}>
      <ContactsScreen />
    </DataGuard>
  );
}

function ContactsScreen() {
  const { dataset, applications, deleteContact } = useTracker();
  const [query, setQuery] = React.useState("");
  const [relationships, setRelationships] = React.useState<RelationshipType[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Contact | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<Contact | null>(null);

  const companyById = React.useMemo(
    () => new Map(dataset.companies.map((company) => [company.id, company])),
    [dataset.companies],
  );

  /** Applications each contact is linked to, for the "Linked to" column. */
  const linkedApplications = React.useMemo(() => {
    const map = new Map<string, { id: string; label: string }[]>();
    for (const link of dataset.applicationContacts) {
      const application = applications.find((item) => item.id === link.applicationId);
      if (!application) continue;
      const entry = { id: application.id, label: application.position };
      const existing = map.get(link.contactId);
      if (existing) existing.push(entry);
      else map.set(link.contactId, [entry]);
    }
    return map;
  }, [dataset.applicationContacts, applications]);

  const rows = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return dataset.contacts
      .filter((contact) => {
        if (relationships.length > 0 && !relationships.includes(contact.relationship)) return false;
        if (!term) return true;
        const company = contact.companyId ? companyById.get(contact.companyId) : undefined;
        return [contact.name, contact.jobTitle, contact.email, contact.notes, company?.name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [dataset.contacts, query, relationships, companyById]);

  const openEdit = (contact: Contact) => {
    setEditing(contact);
    setDialogOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Contacts"
        description={`${dataset.contacts.length} recruiting and networking contacts`}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus />
            Add contact
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5 lg:px-6">
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search contacts…"
            className="h-8 pl-8"
          />
        </div>
        <FilterMenu
          label="Relationship"
          options={RELATIONSHIP_TYPES.map((relationship) => ({
            value: relationship,
            label: relationship,
            count: dataset.contacts.filter((c) => c.relationship === relationship).length,
          }))}
          selected={relationships}
          onChange={(values) => setRelationships(values as RelationshipType[])}
        />
      </div>

      {rows.length === 0 ? (
        <div className="p-4 lg:p-6">
          <EmptyState
            icon={Users}
            title={query || relationships.length ? "No contacts match" : "No contacts yet"}
            description={
              query || relationships.length
                ? "Try clearing the search or the relationship filter."
                : "Track recruiters, alumni and interviewers so follow-ups never slip."
            }
            action={
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus />
                Add contact
              </Button>
            }
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Job title</TableHead>
                <TableHead>Relationship</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Last contact</TableHead>
                <TableHead>Next follow-up</TableHead>
                <TableHead>Linked to</TableHead>
                <TableHead className="w-10 pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((contact) => {
                const company = contact.companyId ? companyById.get(contact.companyId) : undefined;
                const profile = normalizeUrl(contact.linkedinUrl);
                const linked = linkedApplications.get(contact.id) ?? [];
                const followUpLate = isOverdue(contact.nextFollowUpDate);

                return (
                  <TableRow key={contact.id} className="group">
                    <TableCell className="pl-4 font-medium">{contact.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {company ? (
                        <Link href={`/companies/${company.id}`} className="hover:underline">
                          {company.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {contact.jobTitle ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="muted">{contact.relationship}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            title={contact.email}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Mail className="size-3.5" />
                          </a>
                        )}
                        {contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            title={contact.phone}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Phone className="size-3.5" />
                          </a>
                        )}
                        {profile && (
                          <a
                            href={profile}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="LinkedIn"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Linkedin className="size-3.5" />
                          </a>
                        )}
                        {!contact.email && !contact.phone && !profile && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {contact.lastContactDate ? formatDate(contact.lastContactDate) : "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "whitespace-nowrap text-muted-foreground",
                        followUpLate && "font-medium text-destructive",
                      )}
                    >
                      {contact.nextFollowUpDate ? relativeDay(contact.nextFollowUpDate) : "—"}
                    </TableCell>
                    <TableCell className="max-w-[220px] text-muted-foreground">
                      {linked.length === 0 ? (
                        "—"
                      ) : (
                        <span className="truncate" title={linked.map((item) => item.label).join(", ")}>
                          <Link href={`/applications/${linked[0].id}`} className="hover:underline">
                            {linked[0].label}
                          </Link>
                          {linked.length > 1 && ` +${linked.length - 1}`}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                            aria-label={`Actions for ${contact.name}`}
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openEdit(contact)}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem destructive onSelect={() => setPendingDelete(contact)}>
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
      )}

      <ContactDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        contact={editing}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this contact?"
        description={
          pendingDelete
            ? `${pendingDelete.name} will be removed and unlinked from any applications.`
            : undefined
        }
        onConfirm={async () => {
          if (pendingDelete) await deleteContact(pendingDelete.id);
        }}
      />
    </>
  );
}

function ContactsSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4 lg:p-6">
      <Skeleton className="h-8 w-36" />
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton key={index} className="h-9 w-full" />
      ))}
    </div>
  );
}
