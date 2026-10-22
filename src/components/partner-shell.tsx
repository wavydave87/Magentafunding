import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BadgeDollarSign,
  LogOut,
  ChevronDown,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  Settings,
  Share2,
  Users,
  Users2,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { BrandFooter, logoAsset } from "@/components/brand";
import { NotificationBell } from "@/components/partner/notification-bell";
import { ReferBusinessDialog } from "@/components/partner/refer-business-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PartnerViewBanner } from "@/components/partner/partner-view-banner";
import { usePartnerView } from "@/hooks/use-partner-view";
import { usePortalIdentity } from "@/hooks/use-portal-identity";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Organization admins only. */
  adminOnly?: boolean;
}

/** Partner workspace navigation. Ordered by how often a partner needs it. */
const PRIMARY_NAV: NavItem[] = [
  { label: "Overview", to: "/portal", icon: LayoutDashboard },
  { label: "Referrals", to: "/portal/referrals", icon: Users2 },
  { label: "Referral Tools", to: "/portal/referral-tools", icon: Share2 },
  { label: "Commissions", to: "/portal/commissions", icon: BadgeDollarSign },
  { label: "Team", to: "/portal/team", icon: Users, adminOnly: true },
  { label: "Training", to: "/portal/training", icon: GraduationCap },
  { label: "Resources", to: "/portal/resources", icon: FolderOpen },
  { label: "Support", to: "/portal/support", icon: LifeBuoy },
];

const BOTTOM_NAV: NavItem[] = [{ label: "Settings", to: "/portal/settings", icon: Settings }];

/** Page title shown in the header, longest match wins. */
const TITLES: [string, string][] = [
  ["/portal/referral-tools", "Referral Tools"],
  ["/portal/referrals", "Referrals"],
  ["/portal/commissions", "Commissions"],
  ["/portal/team", "Team"],
  ["/portal/training", "Training"],
  ["/portal/resources", "Resources"],
  ["/portal/support", "Support"],
  ["/portal/settings", "Settings"],
  ["/portal/notifications", "Notifications"],
  ["/portal/analytics", "Analytics"],
  ["/portal", "Overview"],
];

function pageTitle(pathname: string) {
  return TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "Overview";
}

/**
 * The partner workspace shell: a quiet sidebar on desktop, a drawer on mobile,
 * and a header that always carries the page title, the organization and the
 * single most valuable action — Refer a Business.
 */
export function PartnerShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: identity } = usePortalIdentity();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: partnerView } = usePartnerView();

  const isOrgAdmin = identity?.member?.role === "organization_admin";
  const nav = PRIMARY_NAV.filter((item) => !item.adminOnly || isOrgAdmin);

  const isActive = (to: string) =>
    to === "/portal"
      ? pathname === "/portal" || pathname === "/portal/"
      : pathname.startsWith(to);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/portal/login", replace: true });
  }

  const navLink = (item: NavItem, onSelect?: () => void) => {
    const Icon = item.icon;
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={onSelect}
        aria-current={isActive(item.to) ? "page" : undefined}
        className={cn(
          "focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
          isActive(item.to)
            ? "bg-accent font-medium text-accent-foreground"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {item.label}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="px-5 py-5">
          <Link to="/portal" className="focus-ring inline-block rounded">
            <img src={logoAsset.url} alt="Magenta" className="h-9 w-auto" />
          </Link>
          <p className="mt-3 text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Partner Portal
          </p>
        </div>
        <nav aria-label="Partner" className="flex-1 space-y-1 overflow-y-auto px-3">
          {nav.map((item) => navLink(item))}
        </nav>
        <div className="space-y-1 border-t border-border px-3 py-3">
          {BOTTOM_NAV.map((item) => navLink(item))}
          <button
            type="button"
            onClick={() => void signOut()}
            className="focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {partnerView ? <PartnerViewBanner /> : null}
        <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            {/* Mobile drawer */}
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden" aria-label="Open menu">
                  <Menu className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {[...nav, ...BOTTOM_NAV].map((item) => (
                  <DropdownMenuItem key={item.to} asChild>
                    <Link to={item.to}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void signOut()}>Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="min-w-0 flex-1">
              <h1 className="font-display truncate text-lg leading-tight">
                {pageTitle(pathname)}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {identity?.member?.organization?.name ?? "Magenta Partner Network"}
              </p>
            </div>

            <div className="hidden sm:block">
              <ReferBusinessDialog />
            </div>
            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <span className="max-w-[8rem] truncate">
                    {identity?.member?.full_name?.split(" ")[0] ?? "Account"}
                  </span>
                  <ChevronDown className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">
                  {identity?.member?.full_name ?? identity?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/portal/settings">My Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/portal/settings">Organization</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/portal/settings">Settings</Link>
                </DropdownMenuItem>
                {isOrgAdmin ? (
                  <DropdownMenuItem asChild>
                    <Link to="/portal/team">Manage Team</Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void signOut()}>Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="bg-rule-gradient h-[2px]" />
        </header>

        <main className="flex-1 overflow-x-clip">
          <div className="mx-auto max-w-6xl px-5 py-8 sm:py-10">{children}</div>
        </main>

        {/* Mobile quick action — referring is the point of the portal. */}
        <div className="sticky bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-md sm:hidden">
          <ReferBusinessDialog
            trigger={
              <Button className="w-full">
                <Share2 className="mr-2 h-4 w-4" aria-hidden="true" /> Refer a Business
              </Button>
            }
          />
        </div>

        <BrandFooter
          note={
            identity?.member?.organization?.name
              ? `Magenta Referral Partner Portal · ${identity.member.organization.name}.`
              : "Magenta Referral Partner Portal."
          }
        />
      </div>
    </div>
  );
}
