import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, useIsAdmin } from "@/components/app-shell";
import { PortalPageHeader } from "@/components/partner/page-header";
import { PortalGuard } from "@/components/partner/portal-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRepAccount, listRepAccounts } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Magenta Portal" },
      { name: "description", content: "Provision and review Magenta staff accounts for Magenta Portal." },
      { property: "og:title", content: "Administration — Magenta Portal" },
      { property: "og:description", content: "Provision and review rep accounts." },
    ],
  }),
  component: () => (
    <PortalGuard audience="internal">
      <AdminPage />
    </PortalGuard>
  ),
});

function AdminPage() {
  const { data: isAdmin, isLoading: checking } = useIsAdmin();
  const queryClient = useQueryClient();
  const listReps = useServerFn(listRepAccounts);
  const createRep = useServerFn(createRepAccount);

  const [form, setForm] = useState({ email: "", fullName: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);

  const { data: reps } = useQuery({
    enabled: isAdmin === true,
    queryKey: ["reps"],
    queryFn: () => listReps(),
  });

  if (checking) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Checking your access…</p>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="card-elevated p-10 text-center">
          <h1 className="text-2xl">Administrators only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ask an admin to grant you access if you need to manage rep accounts.
          </p>
        </div>
      </AppShell>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createRep({
        data: {
          email: form.email,
          password: form.password,
          full_name: form.fullName,
          phone: form.phone,
        },
      });
      toast.success(`${form.fullName} can now sign in.`);
      setForm({ email: "", fullName: "", phone: "", password: "" });
      await queryClient.invalidateQueries({ queryKey: ["reps"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <PortalPageHeader
        title="Administration"
        subtitle="Reps can't sign themselves up — create their account and share the password."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <form className="card-elevated space-y-4 p-6" onSubmit={submit}>
          <h2 className="text-xl">Add a rep</h2>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repEmail">Work email</Label>
            <Input
              id="repEmail"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repPhone">Phone (shown to clients)</Label>
            <Input
              id="repPhone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repPassword">Temporary password</Label>
            <Input
              id="repPassword"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Creating…" : "Create rep account"}
          </Button>
        </form>

        <div className="card-elevated p-6">
          <h2 className="text-xl">Current reps</h2>
          <div className="mt-4 divide-y divide-border">
            {(reps ?? []).map((rep) => (
              <div key={rep.id} className="py-3">
                <p className="font-medium">{rep.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {rep.email}
                  {rep.phone ? ` · ${rep.phone}` : ""}
                </p>
              </div>
            ))}
            {(reps?.length ?? 0) === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">No reps yet.</p>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
