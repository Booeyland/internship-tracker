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
import { EnumSelect } from "@/components/common/enum-select";
import { useTracker } from "@/hooks/use-tracker";
import { INDUSTRIES, type Company, type Industry } from "@/types";

interface CompanyDraft {
  name: string;
  industry: Industry | null;
  website: string;
  careersUrl: string;
  headquarters: string;
  logoUrl: string;
  notes: string;
}

const emptyDraft = (): CompanyDraft => ({
  name: "",
  industry: null,
  website: "",
  careersUrl: "",
  headquarters: "",
  logoUrl: "",
  notes: "",
});

export function CompanyDialog({
  open,
  onOpenChange,
  company,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: Company | null;
}) {
  const { createCompany, updateCompany, saving } = useTracker();
  const [draft, setDraft] = React.useState<CompanyDraft>(emptyDraft);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setDraft(
      company
        ? {
            name: company.name,
            industry: company.industry,
            website: company.website ?? "",
            careersUrl: company.careersUrl ?? "",
            headquarters: company.headquarters ?? "",
            logoUrl: company.logoUrl ?? "",
            notes: company.notes ?? "",
          }
        : emptyDraft(),
    );
    setError(null);
  }, [open, company]);

  const set = <K extends keyof CompanyDraft>(key: K, value: CompanyDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function submit() {
    if (!draft.name.trim()) {
      setError("A company name is required");
      return;
    }
    const payload = {
      name: draft.name.trim(),
      industry: draft.industry,
      website: draft.website.trim() || null,
      careersUrl: draft.careersUrl.trim() || null,
      headquarters: draft.headquarters.trim() || null,
      logoUrl: draft.logoUrl.trim() || null,
      notes: draft.notes.trim() || null,
    };

    if (company) {
      await updateCompany(company.id, payload);
      onOpenChange(false);
      return;
    }
    const created = await createCompany(payload);
    if (created) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{company ? "Edit company" : "Add company"}</DialogTitle>
          <DialogDescription>
            Companies are created automatically when you add an application — edit them here to add
            detail.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Company name" htmlFor="company-name" required error={error}>
              <Input
                id="company-name"
                autoFocus
                value={draft.name}
                onChange={(event) => set("name", event.target.value)}
              />
            </Field>
            <Field label="Industry" htmlFor="company-industry">
              <EnumSelect
                id="company-industry"
                options={INDUSTRIES}
                value={draft.industry}
                onChange={(value) => set("industry", value)}
                allowEmpty
              />
            </Field>
            <Field
              label="Website"
              htmlFor="company-website"
              hint="Used to find the logo automatically."
            >
              <Input
                id="company-website"
                placeholder="goldmansachs.com"
                value={draft.website}
                onChange={(event) => set("website", event.target.value)}
              />
            </Field>
            <Field label="Headquarters" htmlFor="company-hq">
              <Input
                id="company-hq"
                placeholder="New York, NY"
                value={draft.headquarters}
                onChange={(event) => set("headquarters", event.target.value)}
              />
            </Field>
            <Field label="Careers page" htmlFor="company-careers" className="sm:col-span-2">
              <Input
                id="company-careers"
                value={draft.careersUrl}
                onChange={(event) => set("careersUrl", event.target.value)}
              />
            </Field>
            <Field
              label="Logo URL"
              htmlFor="company-logo"
              className="sm:col-span-2"
              hint="Optional — overrides the logo derived from the website."
            >
              <Input
                id="company-logo"
                value={draft.logoUrl}
                onChange={(event) => set("logoUrl", event.target.value)}
              />
            </Field>
            <Field label="Notes" htmlFor="company-notes" className="sm:col-span-2">
              <Textarea
                id="company-notes"
                rows={3}
                placeholder="Recruiting timeline, process quirks, who you know there…"
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
              {company ? "Save changes" : "Add company"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
