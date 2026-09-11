"use client";

import * as React from "react";
import { Link2, Linkedin, Mail, Plus, Unlink, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/common/empty-state";
import { ContactDialog } from "@/components/contacts/contact-dialog";
import { useTracker } from "@/hooks/use-tracker";
import { formatDate } from "@/lib/dates";
import { normalizeUrl } from "@/lib/utils";
import type { Contact } from "@/types";

/** Contacts linked to one application, with linking of existing contacts. */
export function ApplicationContacts({
  applicationId,
  companyId,
  contacts,
}: {
  applicationId: string;
  companyId: string;
  contacts: Contact[];
}) {
  const { dataset, linkContact, unlinkContact } = useTracker();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const linkedIds = new Set(contacts.map((contact) => contact.id));
  const linkable = dataset.contacts.filter((contact) => !linkedIds.has(contact.id));

  return (
    <>
      <div className="flex items-center justify-end gap-1.5 pb-2">
        {linkable.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="xs">
                <Link2 />
                Link existing
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 w-64 overflow-y-auto">
              <DropdownMenuLabel>Link a contact</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {linkable.map((contact) => (
                <DropdownMenuItem
                  key={contact.id}
                  onSelect={() => void linkContact(applicationId, contact.id, contact.relationship)}
                >
                  <span className="flex-1 truncate">{contact.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {contact.relationship}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button variant="outline" size="xs" onClick={() => setDialogOpen(true)}>
          <Plus />
          New contact
        </Button>
      </div>

      {contacts.length === 0 ? (
        <EmptyState
          compact
          icon={Users}
          title="No contacts linked"
          description="Link the recruiter, referral or interviewers connected to this application."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {contacts.map((contact) => {
            const profile = normalizeUrl(contact.linkedinUrl);
            return (
              <li key={contact.id} className="group flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{contact.name}</span>
                    <Badge variant="muted">{contact.relationship}</Badge>
                  </div>
                  {contact.jobTitle && (
                    <p className="text-xs text-muted-foreground">{contact.jobTitle}</p>
                  )}
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="inline-flex items-center gap-1 underline underline-offset-2"
                      >
                        <Mail className="size-3" />
                        {contact.email}
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
                  {contact.notes && (
                    <p className="mt-1 text-xs text-muted-foreground">{contact.notes}</p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={`Unlink ${contact.name}`}
                  title="Unlink from this application"
                  onClick={() => void unlinkContact(applicationId, contact.id)}
                >
                  <Unlink />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <ContactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultCompanyId={companyId}
        onCreated={(contact) => void linkContact(applicationId, contact.id, contact.relationship)}
      />
    </>
  );
}
