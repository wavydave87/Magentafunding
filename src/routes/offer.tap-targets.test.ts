import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Mobile layout guard: every interactive control on the public offer page must carry a
 * >=44px tap target (min-h-11 / min-h-20 for the note field) plus a visible focus style.
 * Source-level so it runs in CI with no browser.
 */
const source = readFileSync("src/routes/offer.$dealId.tsx", "utf8");

/** For each control, grab the first className string that follows it. */
function controls(tag: string) {
  const found: { tag: string; className: string }[] = [];
  const re = new RegExp(`<${tag}[\\s\\n]`, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    const slice = source.slice(match.index, match.index + 1400);
    const className = /className=(?:"([^"]*)"|\{`([^`]*)`\})/.exec(slice);
    found.push({
      tag: slice.slice(0, 120),
      className: className ? (className[1] ?? className[2] ?? "") : "",
    });
  }
  return found;
}

const tappable = [...controls("button"), ...controls("textarea")].filter(
  (c) => !c.tag.includes('type="hidden"') && !c.tag.includes('type="file"'),
);

describe("public offer page mobile tap targets", () => {
  it("finds the interactive controls", () => {
    expect(tappable.length).toBeGreaterThan(8);
  });

  it("gives every control a visible focus style", () => {
    const missing = tappable.filter((c) => !c.className.includes("focus-ring"));
    expect(missing.map((c) => c.tag)).toEqual([]);
  });

  it("gives every tappable control at least a 44px height", () => {
    const tooSmall = tappable.filter(
      (c) => !/min-h-(11|12|14|16|20)|size-(11|12)/.test(c.className),
    );
    expect(tooSmall.map((c) => c.tag)).toEqual([]);
  });

  it("keeps the picker and stat grids single-column on small screens", () => {
    expect(source).toMatch(/gap-3\.5[^"]*md:grid-cols-3/);
    expect(source).toMatch(/grid-cols-1[^"]*sm:grid-cols-2/);
  });
});

describe("persistent brand banner", () => {
  const brand = readFileSync(
    new URL("../components/brand.tsx", import.meta.url),
    "utf8",
  );

  it("sticks to the top of every surface", () => {
    expect(brand).toMatch(/sticky top-0/);
  });

  it("closes with the brand gradient rule", () => {
    expect(brand).toMatch(/bg-rule-gradient/);
  });

  it("gives the merchant rep contact control a 44px tap target", () => {
    const banner = source.slice(0, source.indexOf("Skip to your offer options"));
    const controls = banner.match(/min-h-11/g) ?? [];
    expect(controls.length).toBeGreaterThanOrEqual(2);
  });
});
