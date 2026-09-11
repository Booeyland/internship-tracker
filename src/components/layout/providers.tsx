"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

import { TooltipProvider } from "@/components/ui/tooltip";
import { TrackerProvider } from "@/hooks/use-tracker";
import { UiProvider } from "@/hooks/use-ui";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TrackerProvider>
        <UiProvider>
          <TooltipProvider delayDuration={250} skipDelayDuration={200}>
            {children}
            <Toaster
              position="bottom-right"
              richColors
              closeButton
              toastOptions={{ className: "text-sm" }}
            />
          </TooltipProvider>
        </UiProvider>
      </TrackerProvider>
    </ThemeProvider>
  );
}
