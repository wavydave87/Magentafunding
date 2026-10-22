import { BrandFooter, BrandHeader } from "@/components/brand";
import { SignInForm } from "@/components/sign-in-form";

/**
 * The staff sign-in screen. Partners get the split-screen page at
 * `/portal/login`; both render the same {@link SignInForm}.
 */
export function SignInCard({
  title,
  intro,
  emailLabel = "Work email",
  footNote,
  footerNote,
  onSignedIn,
}: {
  title: string;
  intro: string;
  emailLabel?: string;
  /** Small print inside the card, below the form. */
  footNote?: string;
  /** Overrides the page footer note. */
  footerNote?: string;
  onSignedIn: () => Promise<void> | void;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <BrandHeader />
      <main className="bg-brand-wash flex flex-1 items-center justify-center px-5 py-16">
        <div className="card-elevated w-full max-w-md p-7">
          <h1 className="text-2xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{intro}</p>
          <SignInForm emailLabel={emailLabel} onSignedIn={onSignedIn} />
          {footNote ? <p className="mt-6 text-xs text-muted-foreground">{footNote}</p> : null}
        </div>
      </main>
      {footerNote ? <BrandFooter note={footerNote} /> : <BrandFooter />}
    </div>
  );
}
