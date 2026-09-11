import type { Metadata } from "next";

import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { Providers } from "@/components/layout/providers";

export const metadata: Metadata = {
  title: "Internship Tracker",
  description:
    "A recruiting command center for internship applications: pipeline, interviews, follow-ups and analytics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
