"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "dirty" | "saving" | "saved";

/**
 * Debounced auto-saving notes field. Keeps a local draft so typing never
 * stutters, and reports save state so the user knows the note persisted.
 */
export function NotesEditor({
  value,
  onSave,
  placeholder,
  rows = 8,
  label,
}: {
  value: string | null;
  onSave: (next: string | null) => Promise<void>;
  placeholder?: string;
  rows?: number;
  label?: string;
}) {
  const [draft, setDraft] = React.useState(value ?? "");
  const [state, setState] = React.useState<SaveState>("idle");
  const savedValue = React.useRef(value ?? "");

  // Adopt external changes only while the field is not mid-edit.
  React.useEffect(() => {
    if (state === "idle" || state === "saved") {
      savedValue.current = value ?? "";
      setDraft(value ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  React.useEffect(() => {
    if (state !== "dirty") return;
    const timer = window.setTimeout(async () => {
      setState("saving");
      const next = draft.trim() === "" ? null : draft;
      await onSave(next);
      savedValue.current = draft;
      setState("saved");
    }, 700);
    return () => window.clearTimeout(timer);
  }, [draft, state, onSave]);

  // Clear the "saved" flash after a moment.
  React.useEffect(() => {
    if (state !== "saved") return;
    const timer = window.setTimeout(() => setState("idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [state]);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <SaveIndicator state={state} />
        </div>
      )}
      <Textarea
        rows={rows}
        value={draft}
        placeholder={placeholder}
        onChange={(event) => {
          setDraft(event.target.value);
          setState("dirty");
        }}
        className="resize-y text-sm leading-relaxed"
      />
      {!label && (
        <div className="flex justify-end">
          <SaveIndicator state={state} />
        </div>
      )}
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 text-xs text-muted-foreground transition-opacity",
        state === "idle" && "opacity-0",
      )}
      aria-live="polite"
    >
      {state === "saving" && <Loader2 className="size-3 animate-spin" />}
      {state === "saved" && <Check className="size-3" />}
      {state === "dirty" ? "Unsaved" : state === "saving" ? "Saving…" : state === "saved" ? "Saved" : ""}
    </span>
  );
}
