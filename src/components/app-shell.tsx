import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Menu } from "lucide-react";
import { useState, type ReactNode } from "react";

import { BrandFooter, BrandHeader } from "@/components/brand";
import { NotificationBell } from "@/components/partner/notification-bell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePortalIdentity } from "@/hooks/use-portal-identity";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      return Boolean(data);
    },
  });
}

interface NavItem {
  label: string;
  to: string;
}

const INTERNAL_PRIMARY: NavItem[] = [
  { label: "Offers", to: "/dashboard" },
  { label: "Partner Network", to: "/partners" },
  { label: "Commissions", to: "/commissions" },
  { label: "Support", to: "/support" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: identity } = usePortalIdentity();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const signedIn = Boolean(identity?.userId);

  // Internal shell only — the partner workspace has its own shell at /portal.
  const primary: NavItem[] = [
    ...INTERNAL_PRIMARY,
    ...(identity?.isAdmin
      ? [
          { label: "Library", to: "/library" },
          { label: "Administration", to: "/admin" },
        ]
      : []),
  ];
  const more: NavItem[] = [];
  const allItems = [...primary, ...more];

  const homeTo = "/dashboard";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const isActive = (to: string) =>
    to === "/dashboard" ? pathname.startsWith("/dashboard") : pathname.startsWith(to);

  return (
    <div className="flex min-h-screen flex-col">
      <BrandHeader
        to={homeTo}
        right={
          <>
            <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
              {primary.map((item) => (
                <Button
                  key={item.label}
                  asChild
                  variant="ghost"
                  size="sm"
                  className={cn(isActive(item.to) && "bg-accent text-accent-foreground")}
                >
                  <Link to={item.to}>{item.label}</Link>
                </Button>
              ))}
              {more.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        more.some((m) => isActive(m.to)) && "bg-accent text-accent-foreground",
                      )}
                    >
                      More
                      <ChevronDown className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {more.map((item) => (
                      <DropdownMenuItem key={item.label} asChild>
                        <Link to={item.to}>{item.label}</Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </nav>

            {signedIn ? <NotificationBell /> : null}

            <Button
              variant="outline"
              size="sm"
              className="hidden lg:inline-flex"
              onClick={signOut}
            >
              Sign Out
            </Button>

            <DropdownMenu open={open} onOpenChange={setOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden" aria-label="Open menu">
                  <Menu className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {allItems.map((item) => (
                  <DropdownMenuItem key={item.label} asChild>
                    <Link to={item.to}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void signOut()}>Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />
      <main className="flex-1 overflow-x-clip">
        <div className="mx-auto max-w-6xl px-5 py-10">{children}</div>
      </main>
      <BrandFooter note="Magenta Portal · Internal use only — buy rate and upsell are never shown to clients." />
    </div>
  );
}
