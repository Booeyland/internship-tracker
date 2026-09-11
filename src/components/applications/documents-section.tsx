"use client";

import * as React from "react";
import { ExternalLink, FileText, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/common/field";
import { EnumSelect } from "@/components/common/enum-select";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { useTracker } from "@/hooks/use-tracker";
import { normalizeUrl } from "@/lib/utils";
import { DOCUMENT_TYPES, type ApplicationDocument, type DocumentType } from "@/types";

/** Tracks which materials were submitted with an application. */
export function DocumentsSection({
  applicationId,
  documents,
  defaultResumeName,
}: {
  applicationId: string;
  documents: ApplicationDocument[];
  defaultResumeName: string | null;
}) {
  const { createDocument, updateDocument, deleteDocument, saving } = useTracker();
  const [open, setOpen] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<ApplicationDocument | null>(null);
  const [draft, setDraft] = React.useState({
    documentType: "Resume" as DocumentType,
    name: "",
    fileUrl: "",
    submitted: true,
  });
  const [error, setError] = React.useState<string | null>(null);

  const openDialog = () => {
    setDraft({
      documentType: "Resume",
      name: defaultResumeName ?? "",
      fileUrl: "",
      submitted: true,
    });
    setError(null);
    setOpen(true);
  };

  async function submit() {
    if (!draft.name.trim()) {
      setError("Give the document a name");
      return;
    }
    const created = await createDocument({
      applicationId,
      documentType: draft.documentType,
      name: draft.name.trim(),
      fileUrl: draft.fileUrl.trim() || null,
      submitted: draft.submitted,
    });
    if (created) setOpen(false);
  }

  return (
    <>
      <div className="flex items-center justify-end pb-2">
        <Button variant="outline" size="xs" onClick={openDialog}>
          <Plus />
          Track document
        </Button>
      </div>

      {documents.length === 0 ? (
        <EmptyState
          compact
          icon={FileText}
          title="No documents tracked"
          description="Record which resume, cover letter or transcript you sent with this application."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {documents.map((document) => {
            const url = normalizeUrl(document.fileUrl);
            return (
              <li key={document.id} className="group flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <Checkbox
                  checked={document.submitted}
                  onCheckedChange={(checked) =>
                    void updateDocument(document.id, { submitted: checked === true })
                  }
                  aria-label={`Mark ${document.name} as submitted`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{document.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {document.submitted ? "Submitted" : "Not submitted"}
                  </p>
                </div>
                <Badge variant="muted" className="shrink-0">
                  {document.documentType}
                </Badge>
                {url && (
                  <Button asChild variant="ghost" size="icon-xs" className="shrink-0">
                    <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Open document">
                      <ExternalLink />
                    </a>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={`Delete ${document.name}`}
                  onClick={() => setPendingDelete(document)}
                >
                  <Trash2 />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Track a document</DialogTitle>
            <DialogDescription>Record the materials you sent with this application.</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <Field label="Document type" htmlFor="document-type">
              <EnumSelect
                id="document-type"
                options={DOCUMENT_TYPES}
                value={draft.documentType}
                onChange={(value) => value && setDraft((d) => ({ ...d, documentType: value }))}
              />
            </Field>
            <Field label="Name" htmlFor="document-name" required error={error}>
              <Input
                id="document-name"
                autoFocus
                placeholder="Investment Banking Resume v4"
                value={draft.name}
                onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))}
              />
            </Field>
            <Field label="Link" htmlFor="document-url" hint="Optional link to the file.">
              <Input
                id="document-url"
                value={draft.fileUrl}
                onChange={(event) => setDraft((d) => ({ ...d, fileUrl: event.target.value }))}
              />
            </Field>
            <div className="flex items-center gap-2">
              <Checkbox
                id="document-submitted"
                checked={draft.submitted}
                onCheckedChange={(checked) =>
                  setDraft((d) => ({ ...d, submitted: checked === true }))
                }
              />
              <label htmlFor="document-submitted" className="cursor-pointer text-sm">
                Already submitted
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                Add document
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Remove this document?"
        description={pendingDelete ? `“${pendingDelete.name}” will no longer be tracked.` : undefined}
        confirmLabel="Remove"
        onConfirm={async () => {
          if (pendingDelete) await deleteDocument(pendingDelete.id);
        }}
      />
    </>
  );
}
