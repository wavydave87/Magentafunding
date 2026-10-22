import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, ExternalLink, FileText, Search } from "lucide-react";

import { PartnerShell } from "@/components/partner-shell";
import { PortalPageHeader } from "@/components/partner/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { portalDb } from "@/lib/portal-db";
import { openResourceFile } from "@/lib/partner-resources";

export const Route = createFileRoute("/_portal/portal/resources")({
  head: () => ({
    meta: [
      { title: "Resources — Magenta Portal" },
      {
        name: "description",
        content:
          "Marketing collateral, underwriting guidelines, forms and templates published by Magenta for its partners.",
      },
      { property: "og:title", content: "Resources — Magenta Portal" },
      {
        property: "og:description",
        content: "Collateral, guidelines and templates published by Magenta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResourcesPage,
});

export function useResources() {
  return useQuery({
    queryKey: ["partner-resources"],
    queryFn: async () => {
      const { data, error } = await portalDb
        .from("partner_resources")
        .select(
          "id, title, description, category, kind, link_url, storage_path, file_name, file_size, published, sort_order",
        )
        .order("category")
        .order("sort_order");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export { openResourceFile };

function ResourcesPage() {
  const { data, isLoading } = useResources();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const rows = (data ?? []).filter((r) => r.published);
  const categories = useMemo(
    () => Array.from(new Set(rows.map((r) => r.category))).sort(),
    [rows],
  );

  const filtered = rows
    .filter((r) => (category === "all" ? true : r.category === category))
    .filter((r) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return `${r.title} ${r.description ?? ""} ${r.category}`.toLowerCase().includes(q);
    });

  return (
    <PartnerShell>
      <PortalPageHeader
        title="Resources"
        subtitle="Everything Magenta publishes for partners — collateral, guidelines, forms and templates."
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[15rem] flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources"
            aria-label="Search resources"
            className="pl-9"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
          className="focus-ring h-10 rounded-md border border-input bg-card px-3 text-sm"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card-elevated h-28 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-elevated mt-5 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No resources match. Magenta publishes new material here regularly.
          </p>
        </div>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {filtered.map((r) => (
            <li key={r.id} className="card-elevated flex flex-col gap-3 p-5">
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {r.category}
                </p>
                <h2 className="font-display text-lg">{r.title}</h2>
                {r.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                ) : null}
              </div>
              <div className="mt-auto">
                {r.kind === "link" && r.link_url ? (
                  <Button asChild variant="secondary" size="sm">
                    <a href={r.link_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open Link
                    </a>
                  </Button>
                ) : r.storage_path ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void openResourceFile(r.storage_path as string)}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {r.file_name ?? "Download"}
                  </Button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" aria-hidden="true" /> Coming soon
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </PartnerShell>
  );
}
