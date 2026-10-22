import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Only a genuinely absent session signs someone out. A transient network
    // failure on getUser() must never kick a signed-in Magenta user to /auth.
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      throw redirect({ to: "/auth", search: { redirect: location.href }, replace: true });
    }
    return { user: session.user };
  },
  component: () => <Outlet />,
});

