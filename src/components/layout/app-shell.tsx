"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/sidebar";
import { GlobalSearch, SearchTrigger } from "@/components/layout/global-search";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ApplicationComposer } from "@/components/applications/application-composer";
import { useUi } from "@/hooks/use-ui";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, setSidebarOpen } = useUi();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open navigation">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 gap-0 p-0 sm:max-w-64">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-12 items-center gap-2 border-b border-border px-4">
              <Target className="size-4" />
              <span className="text-sm font-semibold">Internship Tracker</span>
            </div>
            <SidebarNav onNavigate={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        <Link href="/" className="flex shrink-0 items-center gap-2 pr-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground">
            <Target className="size-3.5" />
          </span>
          {/* The wordmark is dropped on narrow screens so search keeps its room. */}
          <span className="hidden whitespace-nowrap text-sm font-semibold tracking-tight sm:inline">
            Internship Tracker
          </span>
        </Link>

        <div className="mx-auto min-w-0 w-full max-w-md px-2">
          <SearchTrigger />
        </div>

        <ThemeToggle />
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
          <div className="sticky top-12 h-[calc(100vh-3rem)]">
            <SidebarNav />
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <GlobalSearch />
      <ApplicationComposer />
    </div>
  );
}
