"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarDays,
  CheckSquare,
  FileText,
  Plus,
  Search,
  User,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { StatusBadge } from "@/components/applications/status-badge";
import { useTracker } from "@/hooks/use-tracker";
import { useUi } from "@/hooks/use-ui";
import { searchCorpus } from "@/lib/selectors";
import { formatDate, relativeDay } from "@/lib/dates";

/** Top bar affordance that opens the palette; also shows the shortcut. */
export function SearchTrigger() {
  const { setSearchOpen } = useUi();
  return (
    <button
      type="button"
      onClick={() => setSearchOpen(true)}
      className="flex h-7 w-full items-center gap-2 rounded-md border border-input bg-background px-2.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent"
    >
      <Search className="size-3.5 shrink-0" />
      <span className="truncate">Search companies, roles, contacts, notes…</span>
      <kbd className="ml-auto hidden shrink-0 rounded border border-border px-1 py-px font-sans text-[10px] sm:inline">
        ⌘K
      </kbd>
    </button>
  );
}

const MAX_PER_GROUP = 6;

export function GlobalSearch() {
  const router = useRouter();
  const { searchOpen, setSearchOpen, openComposer } = useUi();
  const { applications, dataset } = useTracker();
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (!searchOpen) setQuery("");
  }, [searchOpen]);

  const term = query.trim().toLowerCase();

  const results = React.useMemo(() => {
    if (!term) {
      return {
        applications: applications.slice(0, MAX_PER_GROUP),
        companies: [],
        contacts: [],
        tasks: [],
        events: [],
      };
    }

    const matches = (value: string | null | undefined) =>
      Boolean(value && value.toLowerCase().includes(term));

    return {
      applications: applications
        .filter((application) => searchCorpus(application).includes(term))
        .slice(0, MAX_PER_GROUP),
      companies: dataset.companies
        .filter(
          (company) =>
            matches(company.name) ||
            matches(company.industry) ||
            matches(company.headquarters) ||
            matches(company.notes),
        )
        .slice(0, MAX_PER_GROUP),
      contacts: dataset.contacts
        .filter(
          (contact) =>
            matches(contact.name) ||
            matches(contact.jobTitle) ||
            matches(contact.email) ||
            matches(contact.notes),
        )
        .slice(0, MAX_PER_GROUP),
      tasks: dataset.tasks
        .filter((task) => !task.completed && (matches(task.title) || matches(task.notes)))
        .slice(0, MAX_PER_GROUP),
      events: dataset.recruitingEvents
        .filter((event) => matches(event.title) || matches(event.notes) || matches(event.location))
        .slice(0, MAX_PER_GROUP),
    };
  }, [term, applications, dataset]);

  const go = React.useCallback(
    (href: string) => {
      setSearchOpen(false);
      router.push(href);
    },
    [router, setSearchOpen],
  );

  const isEmpty =
    results.applications.length === 0 &&
    results.companies.length === 0 &&
    results.contacts.length === 0 &&
    results.tasks.length === 0 &&
    results.events.length === 0;

  return (
    <CommandDialog open={searchOpen} onOpenChange={setSearchOpen} label="Global search">
      <CommandInput
        placeholder="Search companies, roles, locations, contacts, notes…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isEmpty && <CommandEmpty>No matches for “{query}”.</CommandEmpty>}

        {!term && (
          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => {
                setSearchOpen(false);
                openComposer();
              }}
            >
              <Plus className="size-4 text-muted-foreground" />
              Add application
              <kbd className="ml-auto rounded border border-border px-1 text-[10px] text-muted-foreground">
                N
              </kbd>
            </CommandItem>
          </CommandGroup>
        )}

        {results.applications.length > 0 && (
          <CommandGroup heading={term ? "Applications" : "Recently updated"}>
            {results.applications.map((application) => (
              <CommandItem
                key={application.id}
                value={application.id}
                onSelect={() => go(`/applications/${application.id}`)}
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{application.company.name}</span>
                  <span className="text-muted-foreground"> · {application.position}</span>
                </span>
                <StatusBadge status={application.status} className="shrink-0" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.companies.length > 0 && (
          <CommandGroup heading="Companies">
            {results.companies.map((company) => (
              <CommandItem
                key={company.id}
                value={`company-${company.id}`}
                onSelect={() => go(`/companies/${company.id}`)}
              >
                <Building2 className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{company.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{company.industry}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.contacts.length > 0 && (
          <CommandGroup heading="Contacts">
            {results.contacts.map((contact) => (
              <CommandItem
                key={contact.id}
                value={`contact-${contact.id}`}
                onSelect={() => go("/contacts")}
              >
                <User className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">
                  {contact.name}
                  {contact.jobTitle && (
                    <span className="text-muted-foreground"> · {contact.jobTitle}</span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{contact.relationship}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.tasks.length > 0 && (
          <CommandGroup heading="Tasks">
            {results.tasks.map((task) => (
              <CommandItem
                key={task.id}
                value={`task-${task.id}`}
                onSelect={() => go(task.applicationId ? `/applications/${task.applicationId}` : "/")}
              >
                <CheckSquare className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{task.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {task.dueDate ? relativeDay(task.dueDate) : "No due date"}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.events.length > 0 && (
          <CommandGroup heading="Calendar">
            {results.events.map((event) => (
              <CommandItem
                key={event.id}
                value={`event-${event.id}`}
                onSelect={() =>
                  go(event.applicationId ? `/applications/${event.applicationId}` : "/calendar")
                }
              >
                <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{event.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(event.startsAt)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
