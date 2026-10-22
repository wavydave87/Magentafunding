import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPartnerMemberAccount } from "@/lib/partner-admin.functions";

const ROLES = [
  { value: "organization_admin", label: "Organization Admin" },
  { value: "manager", label: "Manager" },
  { value: "broker", label: "Broker" },
  { value: "referral_rep", label: "Referral Rep" },
  { value: "viewer", label: "Viewer" },
] as const;

function suggestPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(14));
  return `Mg-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}

/** Admin-only creation of a partner login inside one organization. */
export function NewMemberDialog({
  organizationId,
  organizationName,
  defaultRole = "organization_admin",
}: {
  organizationId: string;
  organizationName: string;
  defaultRole?: (typeof ROLES)[number]["value"];
}) {
  const queryClient = useQueryClient();
  const createMember = useServerFn(createPartnerMemberAccount);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    role: defaultRole as (typeof ROLES)[number]["value"],
    password: suggestPassword(),
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createMember({ data: { organization_id: organizationId, ...form } });
      await queryClient.invalidateQueries({ queryKey: ["partner-organization", organizationId] });
      toast.success("Partner user created. Share the temporary password securely.");
      setOpen(false);
      setForm({ full_name: "", email: "", role: defaultRole, password: suggestPassword() });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the user.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <UserPlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Add Partner User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Partner User</DialogTitle>
          <DialogDescription>
            Creates a sign-in for {organizationName}. They'll only ever see their own
            organization's applications.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="member-name">Full Name</Label>
            <Input
              id="member-name"
              required
              value={form.full_name}
              onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-email">Work Email</Label>
            <Input
              id="member-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-role">Role</Label>
            <select
              id="member-role"
              value={form.role}
              onChange={(e) =>
                setForm((p) => ({ ...p, role: e.target.value as typeof form.role }))
              }
              className="focus-ring h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-password">Temporary Password</Label>
            <Input
              id="member-password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Share this over a secure channel and ask them to change it after first sign-in.
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create Partner User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
