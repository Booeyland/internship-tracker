"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/common/field";
import { EnumSelect, OptionSelect } from "@/components/common/enum-select";
import { useTracker } from "@/hooks/use-tracker";
import { RELATIONSHIP_TYPES, type Contact, type RelationshipType } from "@/types";

interface ContactDraft {
  name: string;
  companyId: string | null;
  jobTitle: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  relationship: RelationshipType;
  lastContactDate: string;
  nextFollowUpDate: string;
  notes: string;
}

const emptyDraft = (companyId: string | null = null): ContactDraft => ({
  name: "",
  companyId,
  jobTitle: "",
  email: "",
  phone: "",
  linkedinUrl: "",
  relationship: "Recruiter",
  lastContactDate: "",
  nextFollowUpDate: "",
  notes: "",
});

const fromContact = (contact: Contact): ContactDraft => ({
  name: contact.name,
  companyId: contact.companyId,
  jobTitle: contact.jobTitle ?? "",
  email: contact.email ?? "",
  phone: contact.phone ?? "",
  linkedinUrl: contact.linkedinUrl ?? "",
  relationship: contact.relationship,
  lastContactDate: contact.lastContactDate ?? "",
  nextFollowUpDate: contact.nextFollowUpDate ?? "",
  notes: contact.notes ?? "",
});

/**
 * Create or edit a networking contact. When `onCreated` is supplied the caller
 * gets the new contact back so it can immediately link it to an application.
 */
export function ContactDialog({
  open,
  onOpenChange,
  contact,
  defaultCompanyId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  defaultCompanyId?: string | null;
  onCreated?: (contact: Contact) => void;
}) {
  const { dataset, createContact, updateContact, saving } = useTracker();
  const [draft, setDraft] = React.useState<ContactDraft>(emptyDraft());
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setDraft(contact ? fromContact(contact) : emptyDraft(defaultCompanyId ?? null));
    setError(null);
  }, [open, contact, defaultCompanyId]);

  const set = <K extends keyof ContactDraft>(key: K, value: ContactDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function submit() {
    if (!draft.name.trim()) {
      setError("A name is required");
      return;
    }
    const payload = {
      companyId: draft.companyId,
      name: draft.name.trim(),
      jobTitle: draft.jobTitle.trim() || null,
      email: draft.email.trim() || null,
      phone: draft.phone.trim() || null,
      linkedinUrl: draft.linkedinUrl.trim() || null,
      relationship: draft.relationship,
      lastContactDate: draft.lastContactDate || null,
      nextFollowUpDate: draft.nextFollowUpDate || null,
      notes: draft.notes.trim() || null,
    };

    if (contact) {
      await updateContact(contact.id, payload);
      onOpenChange(false);
      return;
    }

    const created = await createContact(payload);
    if (created) {
      onCreated?.(created);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{contact ? "Edit contact" : "Add contact"}</DialogTitle>
          <DialogDescription>
            Recruiters, alumni and interviewers you want to keep track of.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex max-h-[65vh] flex-col gap-3 overflow-y-auto pr-1"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" htmlFor="contact-name" required error={error}>
              <Input
                id="contact-name"
                autoFocus
                value={draft.name}
                onChange={(event) => set("name", event.target.value)}
              />
            </Field>
            <Field label="Company" htmlFor="contact-company">
              <OptionSelect
                id="contact-company"
                options={dataset.companies.map((company) => ({
                  value: company.id,
                  label: company.name,
                }))}
                value={draft.companyId}
                onChange={(value) => set("companyId", value)}
                allowEmpty
                emptyLabel="No company"
                placeholder="Select a company"
              />
            </Field>
            <Field label="Job title" htmlFor="contact-title">
              <Input
                id="contact-title"
                placeholder="Associate, Investment Banking"
                value={draft.jobTitle}
                onChange={(event) => set("jobTitle", event.target.value)}
              />
            </Field>
            <Field label="Relationship" htmlFor="contact-relationship">
              <EnumSelect
                id="contact-relationship"
                options={RELATIONSHIP_TYPES}
                value={draft.relationship}
                onChange={(value) => value && set("relationship", value)}
              />
            </Field>
            <Field label="Email" htmlFor="contact-email">
              <Input
                id="contact-email"
                type="email"
                value={draft.email}
                onChange={(event) => set("email", event.target.value)}
              />
            </Field>
            <Field label="Phone" htmlFor="contact-phone">
              <Input
                id="contact-phone"
                value={draft.phone}
                onChange={(event) => set("phone", event.target.value)}
              />
            </Field>
            <Field label="LinkedIn" htmlFor="contact-linkedin" className="sm:col-span-2">
              <Input
                id="contact-linkedin"
                placeholder="https://www.linkedin.com/in/…"
                value={draft.linkedinUrl}
                onChange={(event) => set("linkedinUrl", event.target.value)}
              />
            </Field>
            <Field label="Last contact" htmlFor="contact-last">
              <Input
                id="contact-last"
                type="date"
                value={draft.lastContactDate}
                onChange={(event) => set("lastContactDate", event.target.value)}
              />
            </Field>
            <Field label="Next follow-up" htmlFor="contact-next">
              <Input
                id="contact-next"
                type="date"
                value={draft.nextFollowUpDate}
                onChange={(event) => set("nextFollowUpDate", event.target.value)}
              />
            </Field>
            <Field label="Notes" htmlFor="contact-notes" className="sm:col-span-2">
              <Textarea
                id="contact-notes"
                rows={3}
                placeholder="How you met, what you discussed, what to ask next time…"
                value={draft.notes}
                onChange={(event) => set("notes", event.target.value)}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {contact ? "Save changes" : "Add contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
