"use client";

import * as React from "react";

import type { ApplicationWithRelations } from "@/types";

/**
 * Cross-cutting UI state: the global add/edit application panel, the command
 * palette, and the keyboard shortcuts that open them. Keeping this in one
 * provider means any screen can trigger "add application" without prop drilling.
 */
interface UiContextValue {
  composerOpen: boolean;
  /** The application being edited, or null when composing a new one. */
  composerTarget: ApplicationWithRelations | null;
  openComposer: (application?: ApplicationWithRelations) => void;
  closeComposer: () => void;

  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;

  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const UiContext = React.createContext<UiContextValue | null>(null);

/** True when focus is in a field, so single-key shortcuts must not fire. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable ||
    target.getAttribute("role") === "textbox"
  );
}

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [composerTarget, setComposerTarget] = React.useState<ApplicationWithRelations | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const openComposer = React.useCallback((application?: ApplicationWithRelations) => {
    setComposerTarget(application ?? null);
    setComposerOpen(true);
  }, []);

  const closeComposer = React.useCallback(() => {
    setComposerOpen(false);
    // Delay clearing so the panel does not flash empty while animating out.
    window.setTimeout(() => setComposerTarget(null), 200);
  }, []);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;

      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
        return;
      }

      if (isTypingTarget(event.target)) return;

      // "n" adds an application — the single most frequent action in the app.
      if (!meta && !event.altKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        openComposer();
        return;
      }

      if (!meta && event.key === "/") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openComposer]);

  const value = React.useMemo<UiContextValue>(
    () => ({
      composerOpen,
      composerTarget,
      openComposer,
      closeComposer,
      searchOpen,
      setSearchOpen,
      sidebarOpen,
      setSidebarOpen,
    }),
    [composerOpen, composerTarget, openComposer, closeComposer, searchOpen, sidebarOpen],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiContextValue {
  const context = React.useContext(UiContext);
  if (!context) throw new Error("useUi must be used inside <UiProvider>");
  return context;
}
