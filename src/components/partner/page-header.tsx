import type { ReactNode } from "react";

/**
 * One header block for every Magenta screen: optional back link, title, a
 * one-line subtitle and right-aligned actions sitting on the shared brand
 * gradient. The wash is deliberately full-bleed — it runs edge to edge of the
 * viewport while the text stays inside the content column — so every section
 * of the product opens the same way.
 */
export function PortalPageHeader({
  title,
  subtitle,
  actions,
  back,
  wash = true,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Rendered above the title, e.g. a "back to list" link. */
  back?: ReactNode;
  wash?: boolean;
}) {
  const body = (
    <>
      {back ? <div className="mb-2">{back}</div> : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">{title}</h1>
          {subtitle ? (
            <div className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</div>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </>
  );

  if (!wash) return <div className="mb-6">{body}</div>;

  return (
    <div className="relative -mt-10 mb-8 pt-10 pb-8">
      <div
        aria-hidden
        className="bg-brand-wash pointer-events-none absolute inset-y-0 left-1/2 w-screen -translate-x-1/2"
      />
      <div
        aria-hidden
        className="bg-rule-gradient pointer-events-none absolute bottom-0 left-1/2 h-[2px] w-screen -translate-x-1/2 opacity-70"
      />
      <div className="relative">{body}</div>
    </div>
  );
}
