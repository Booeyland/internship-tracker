"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarColor, cn, initials, logoUrlFor } from "@/lib/utils";
import type { Company } from "@/types";

/**
 * Company logos are fetched from a logo service when the company has a website;
 * otherwise we fall back to deterministic initials so the UI never shows a gap.
 */
export function CompanyAvatar({
  company,
  className,
}: {
  company: Pick<Company, "name" | "website" | "logoUrl">;
  className?: string;
}) {
  const src = logoUrlFor(company);
  return (
    <Avatar className={cn("size-7 rounded-md border border-border bg-background", className)}>
      {src && <AvatarImage src={src} alt="" className="p-0.5" />}
      <AvatarFallback className={avatarColor(company.name)}>{initials(company.name)}</AvatarFallback>
    </Avatar>
  );
}
