import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Mobile layout guard for the sales-side surfaces (deal builder + dashboard).
 * Source-level so it runs in CI with no browser: shared primitives must carry a
 * >=44px mobile tap target, and the sales pages must stack to one column and keep
 * the accepted / revision highlights and upload download controls.
 */
const button = readFileSync("src/components/ui/button.tsx", "utf8");
const input = readFileSync("src/components/ui/input.tsx", "utf8");
const deal = readFileSync("src/routes/_authenticated/deals.$dealId.tsx", "utf8");
const dashboard = readFileSync("src/routes/_authenticated/dashboard.tsx", "utf8");
const statusIcons = readFileSync("src/components/deal-status-icons.tsx", "utf8");

describe("sales-side mobile tap targets", () => {
  it("gives every Button size a 44px mobile height", () => {
    const sizes = /size:\s*\{([\s\S]*?)\},/.exec(button)?.[1] ?? "";
    const entries = sizes
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.includes('"'));
    expect(entries.length).toBeGreaterThan(3);
    expect(entries.filter((l) => !l.includes("min-h-11"))).toEqual([]);
  });

  it("gives the icon Button a 44px mobile width", () => {
    expect(button).toMatch(/icon:\s*"[^"]*min-w-11/);
  });

  it("keeps a visible focus style on buttons and inputs", () => {
    expect(button).toContain("focus-visible:ring-1");
    expect(input).toContain("focus-visible:ring-1");
  });

  it("gives text inputs a 44px mobile height", () => {
    expect(input).toMatch(/min-h-11/);
  });

  it("keeps dashboard search, sort, and expandable controls at 44px on mobile", () => {
    expect(dashboard).toMatch(/className="min-h-11 bg-secondary\/45/);
    expect(dashboard).toMatch(/className="min-h-11 rounded-md border/);
    expect(dashboard).toContain("ExpandAllButton");
  });
});

describe("sales-side layout and highlights", () => {
  it("stacks the deal builder to a single column on small screens", () => {
    expect(deal).toMatch(/grid gap-\d[^"]*lg:grid-cols-/);
    expect(deal).toMatch(/grid gap-\d[^"]*sm:grid-cols-2/);
  });

  it("stacks the dashboard cards and wraps their action clusters", () => {
    expect(dashboard).toContain('lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.85fr)]');
    expect(dashboard).toContain("flex flex-wrap justify-end");
  });

  it("keeps deal-page accepted and revision highlights with brand tokens", () => {
    expect(deal).toContain("card-accepted");
    expect(deal).toContain("card-revision");
    expect(deal).not.toMatch(/text-success/);
  });

  it("highlights the full dashboard card for mouse and keyboard focus", () => {
    expect(dashboard).toContain("hover:bg-selected");
    expect(dashboard).toContain("focus-within:bg-selected");
    expect(dashboard).toContain("hover:border-l-primary");
  });

  it("adds right-side quick-status icons with mobile overflow and accessible labels", () => {
    expect(dashboard).toContain("headerActions={({ setOpen })");
    expect(dashboard).toContain("<DealStatusIcons");
    expect(statusIcons).toContain("aria-label=\"Offer quick status\"");
    expect(statusIcons).toContain("+{mobileHidden}");
    expect(statusIcons).toMatch(/min-h-11/);
    expect(statusIcons).toContain("title={item.label}");
  });

  it("keeps per-file Download and Download All in the uploads section", () => {
    expect(deal).toContain("Merchant Uploads");
    expect(deal).toContain("Download All");
    expect(deal).toMatch(/downloadDoc\(doc\)/);
  });
});

describe("dashboard deal search", () => {
  const dash = readFileSync("src/routes/_authenticated/dashboard.tsx", "utf8");

  it("gives the search field a 44px mobile tap target and focus ring", () => {
    const fieldStart = dash.indexOf('aria-label="Search offers by merchant or email"');
    const field = dash.slice(fieldStart - 300, fieldStart + 500);
    expect(field).toMatch(/min-h-11/);
    expect(input).toMatch(/focus-visible:ring-1/);
  });

  it("labels the search field for screen readers", () => {
    expect(dash).toMatch(/aria-label="Search offers by merchant or email"/);
  });

  it("offers an accessible clear-search control", () => {
    expect(dash).toMatch(/aria-label="Clear search"/);
  });
});

describe("accepted offer highlight tokens", () => {
  const css = readFileSync("src/styles.css", "utf8");
  const body = (name: string) => {
    const start = css.indexOf(`@utility ${name} {`);
    return css.slice(start, css.indexOf("}", start));
  };

  it("shares one tint, border and ring between merchant and sales cards", () => {
    const selected = body("card-selected");
    const accepted = body("card-accepted");
    for (const token of ["var(--selected)", "var(--selected-border)", "var(--selected-ring)"]) {
      expect(selected).toContain(token);
      expect(accepted).toContain(token);
    }
  });

  it("does not duplicate colour-mix expressions in the utilities", () => {
    expect(body("card-accepted")).not.toContain("color-mix");
    expect(body("card-selected")).not.toContain("color-mix");
  });
});

describe("dashboard expandable card workspace", () => {
  const dash = readFileSync("src/routes/_authenticated/dashboard.tsx", "utf8");
  const progress = readFileSync("src/components/deal-progress.tsx", "utf8");

  it("uses Stage terminology and keeps it in the filter menu", () => {
    expect(dash).toContain("Filter By Stage");
    expect(dash).toContain('<option value="stage">Stage</option>');
    expect(dash).not.toContain(">State<");
  });

  it("keeps every action visible and send rightmost", () => {
    const actions = dash.slice(dash.indexOf("> Copy Link</Button>"));
    expect(actions.indexOf('{sent ? "Resend" : "Send Offer"}')).toBeGreaterThan(actions.indexOf("Open Deal"));
    expect(dash).toContain("> Preview</a>");
  });

  it("provides amount, view, upload, and expiry filters with a reset", () => {
    expect(dash).toContain('aria-label="Minimum amount"');
    expect(dash).toContain("Not viewed");
    expect(dash).toContain("Has uploads");
    expect(dash).toContain("Next 3 days");
    expect(dash).toContain("Clear all filters");
  });

  it("uses expandable cards with sensible defaults and an expand-all control", () => {
    expect(dash).toContain("<DealTile");
    expect(dash).toContain("defaultOpen={rows.length === 1}");
    expect(dash).toContain("openSignal={expandAll.signal}");
    expect(dash).toContain("<ExpandAllButton");
  });

  it("links every progress step to its deal-page section with a 44px hit area", () => {
    expect(progress).toContain("closing-checklist");
    expect(progress).toContain("merchant-uploads");
    expect(progress).toContain("merchant-activity");
    expect(progress).toMatch(/min-h-11/);
    expect(progress).toMatch(/Jump To/);
  });
});
