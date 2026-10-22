import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, useIsAdmin } from "@/components/app-shell";
import { PortalPageHeader } from "@/components/partner/page-header";
import { PortalGuard } from "@/components/partner/portal-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createRepAccount,
  listPartnerMemberAccounts,
  listRepAccounts,
  resetUserPassword,
  setRepAdmin,
  setUserDisabled,
  updateRepAccount,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Magenta Portal" },
      {
        name: "description",
        content: "Create, edit, and manage Magenta staff and partner sign-ins.",
      },
      { property: "og:title", content: "Administration — Magenta Portal" },
      {
        property: "og:description",
        content: "Create, edit, and manage Magenta staff and partner sign-ins.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <PortalGuard audience="internal">
      <AdminPage />
    </PortalGuard>
  ),
});

type Rep = Awaited<ReturnType<typeof listRepAccounts>>[number];

function AdminPage() {
  const { data: isAdmin, isLoading: checking } = useIsAdmin();
  const queryClient = useQueryClient();
  const listReps = useServerFn(listRepAccounts);
  const createRep = useServerFn(createRepAccount);

  const [form, setForm] = useState({ email: "", fullName: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Rep | null>(null);

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
        subtitle="View and edit every profile, change roles, reset passwords, or turn off sign-in."
      />

      <Tabs defaultValue="staff" className="mt-8">
        <TabsList>
          <TabsTrigger value="staff">Magenta staff</TabsTrigger>
          <TabsTrigger value="partners">Partner members</TabsTrigger>
        </TabsList>
        <TabsContent value="partners" className="mt-6">
          <PartnerMembersPanel />
        </TabsContent>
        <TabsContent value="staff" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
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
              <h2 className="text-xl">All profiles</h2>
              <div className="mt-4 divide-y divide-border">
                {(reps ?? []).map((rep) => (
                  <div
                    key={rep.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        {rep.full_name}
                        {rep.is_self ? <span className="text-muted-foreground"> (you)</span> : null}
                      </p>
                      <p className="text-sm text-muted-foreground break-words">
                        {rep.email}
                        {rep.phone ? ` · ${rep.phone}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(rep.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {rep.roles.includes("admin") ? (
                        <Badge>Admin</Badge>
                      ) : (
                        <Badge variant="secondary">Rep</Badge>
                      )}
                      {rep.disabled ? <Badge variant="destructive">Sign-in off</Badge> : null}
                      <Button size="sm" variant="outline" onClick={() => setEditing(rep)}>
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
                {(reps?.length ?? 0) === 0 ? (
                  <p className="py-3 text-sm text-muted-foreground">No reps yet.</p>
                ) : null}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <EditRepDialog
        rep={editing}
        onClose={() => setEditing(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["reps"] })}
      />
    </AppShell>
  );
}

function EditRepDialog({
  rep,
  onClose,
  onSaved,
}: {
  rep: Rep | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={rep !== null} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {rep?.full_name}</DialogTitle>
        </DialogHeader>
        {rep ? <EditRepForm key={rep.id} rep={rep} onSaved={onSaved} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function EditRepForm({
  rep,
  onSaved,
  onClose,
}: {
  rep: Rep;
  onSaved: () => void;
  onClose: () => void;
}) {
  const update = useServerFn(updateRepAccount);
  const setAdmin = useServerFn(setRepAdmin);
  const resetPw = useServerFn(resetUserPassword);
  const setDisabled = useServerFn(setUserDisabled);

  const [name, setName] = useState(rep.full_name);
  const [email, setEmail] = useState(rep.email);
  const [phone, setPhone] = useState(rep.phone ?? "");
  const [isAdmin, setIsAdmin] = useState(rep.roles.includes("admin"));
  const [disabled, setDis] = useState(rep.disabled);
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      onSaved();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await run(
              () => update({ data: { id: rep.id, full_name: name, email, phone } }),
              "Profile saved.",
            )
          )
            onClose();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="ed-name">Full name</Label>
          <Input id="ed-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ed-email">Email (also their sign-in)</Label>
          <Input
            id="ed-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ed-phone">Phone</Label>
          <Input id="ed-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy}>
          Save profile
        </Button>
      </form>

      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="ed-admin">Admin access</Label>
          <Switch
            id="ed-admin"
            checked={isAdmin}
            disabled={busy || (rep.is_self && isAdmin)}
            onCheckedChange={async (v) => {
              if (
                await run(
                  () => setAdmin({ data: { id: rep.id, is_admin: v } }),
                  v ? "Admin granted." : "Admin removed.",
                )
              )
                setIsAdmin(v);
            }}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="ed-disabled">Sign-in turned off</Label>
          <Switch
            id="ed-disabled"
            checked={disabled}
            disabled={busy || rep.is_self}
            onCheckedChange={async (v) => {
              if (
                await run(
                  () => setDisabled({ data: { id: rep.id, disabled: v } }),
                  v ? "Sign-in turned off." : "Sign-in turned on.",
                )
              )
                setDis(v);
            }}
          />
        </div>
        {rep.is_self ? (
          <p className="text-xs text-muted-foreground">
            You can't remove your own admin access or turn off your own sign-in.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Turning sign-in off stops new sign-ins right away. Someone already signed in can stay
            signed in for up to an hour.
          </p>
        )}
      </div>

      <form
        className="space-y-2 border-t border-border pt-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await run(
              () => resetPw({ data: { id: rep.id, password: newPw } }),
              "Temporary password set.",
            )
          )
            setNewPw("");
        }}
      >
        <Label htmlFor="ed-pw">Set a new temporary password</Label>
        <div className="flex gap-2">
          <Input
            id="ed-pw"
            minLength={8}
            required
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
          />
          <Button type="submit" variant="secondary" disabled={busy}>
            Set
          </Button>
        </div>
      </form>
    </div>
  );
}

type PartnerMember = Awaited<ReturnType<typeof listPartnerMemberAccounts>>[number];

/**
 * Sign-in controls for partner members. Roles and organization membership
 * stay on the partner organization page; this panel only covers access.
 */
function PartnerMembersPanel() {
  const queryClient = useQueryClient();
  const listMembers = useServerFn(listPartnerMemberAccounts);
  const resetPw = useServerFn(resetUserPassword);
  const setDisabled = useServerFn(setUserDisabled);
  const [resetting, setResetting] = useState<PartnerMember | null>(null);
  const [newPw, setNewPw] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ["partner-member-accounts"],
    queryFn: () => listMembers(),
  });

  async function toggleSignIn(member: PartnerMember, disabled: boolean) {
    setBusyId(member.user_id);
    try {
      await setDisabled({ data: { id: member.user_id, disabled } });
      toast.success(disabled ? "Sign-in turned off." : "Sign-in turned on.");
      await queryClient.invalidateQueries({ queryKey: ["partner-member-accounts"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card-elevated p-6">
      <h2 className="text-xl">Partner members</h2>
      <div className="mt-4 divide-y divide-border">
        {isLoading ? (
          <p className="py-3 text-sm text-muted-foreground">Loading partner members…</p>
        ) : null}
        {(members ?? []).map((member) => (
          <div
            key={member.user_id}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <p className="font-medium">{member.full_name}</p>
              <p className="text-sm text-muted-foreground break-words">
                {member.email} · {member.organization_name}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{member.role.replace(/_/g, " ")}</Badge>
              {member.status !== "active" ? <Badge variant="outline">{member.status}</Badge> : null}
              <Label
                htmlFor={`pm-signin-${member.user_id}`}
                className="text-sm text-muted-foreground"
              >
                Sign-in
              </Label>
              <Switch
                id={`pm-signin-${member.user_id}`}
                checked={!member.disabled}
                disabled={busyId === member.user_id}
                onCheckedChange={(on) => void toggleSignIn(member, !on)}
              />
              <Button size="sm" variant="outline" onClick={() => setResetting(member)}>
                Set password
              </Button>
            </div>
          </div>
        ))}
        {!isLoading && (members?.length ?? 0) === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">No partner members with sign-in yet.</p>
        ) : null}
      </div>

      <Dialog
        open={resetting !== null}
        onOpenChange={(o) => {
          if (!o) {
            setResetting(null);
            setNewPw("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set a temporary password for {resetting?.full_name}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!resetting) return;
              setBusyId(resetting.user_id);
              try {
                await resetPw({ data: { id: resetting.user_id, password: newPw } });
                toast.success("Temporary password set.");
                setResetting(null);
                setNewPw("");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Something went wrong.");
              } finally {
                setBusyId(null);
              }
            }}
          >
            <Label htmlFor="pm-pw">New temporary password</Label>
            <Input
              id="pm-pw"
              minLength={8}
              required
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
            <Button type="submit" disabled={busyId !== null}>
              Set password
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
