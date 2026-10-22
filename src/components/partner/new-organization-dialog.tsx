import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus } from "lucide-react";
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
import { createPartnerOrganization } from "@/lib/partner-admin.functions";

const TYPES = [
  { value: "iso", label: "ISO" },
  { value: "referral_partner", label: "Referral Partner" },
  { value: "strategic_partner", label: "Strategic Partner" },
] as const;

/** Admin-only creation of a partner organization. */
export function NewOrganizationDialog({ reps }: { reps: { id: string; full_name: string }[] }) {
  const queryClient = useQueryClient();
  const createOrg = useServerFn(createPartnerOrganization);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    legal_name: "",
    partner_type: "iso" as (typeof TYPES)[number]["value"],
    primary_contact_name: "",
    primary_contact_email: "",
    phone: "",
    website: "",
    assigned_rep_id: "",
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const org = await createOrg({
        data: { ...form, assigned_rep_id: form.assigned_rep_id || null },
      });
      await queryClient.invalidateQueries({ queryKey: ["partner-network"] });
      toast.success(`${org?.name ?? "Organization"} created.`);
      setOpen(false);
      setForm({
        name: "",
        legal_name: "",
        partner_type: "iso",
        primary_contact_name: "",
        primary_contact_email: "",
        phone: "",
        website: "",
        assigned_rep_id: "",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the organization.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          New Partner Organization
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Partner Organization</DialogTitle>
          <DialogDescription>
            Create the organization first, then add its first administrator from the organization
            page.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <Field
            id="org-name"
            label="Organization Name"
            required
            value={form.name}
            onChange={set("name")}
          />
          <Field
            id="org-legal"
            label="Legal Name"
            value={form.legal_name}
            onChange={set("legal_name")}
          />
          <div className="space-y-2">
            <Label htmlFor="org-type">Partner Type</Label>
            <select
              id="org-type"
              value={form.partner_type}
              onChange={(e) => set("partner_type")(e.target.value)}
              className="focus-ring h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-rep">Assigned Magenta Rep</Label>
            <select
              id="org-rep"
              value={form.assigned_rep_id}
              onChange={(e) => set("assigned_rep_id")(e.target.value)}
              className="focus-ring h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
            >
              <option value="">Unassigned</option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.full_name}
                </option>
              ))}
            </select>
          </div>
          <Field
            id="org-contact"
            label="Primary Contact"
            value={form.primary_contact_name}
            onChange={set("primary_contact_name")}
          />
          <Field
            id="org-email"
            label="Contact Email"
            type="email"
            value={form.primary_contact_email}
            onChange={set("primary_contact_email")}
          />
          <Field id="org-phone" label="Phone" value={form.phone} onChange={set("phone")} />
          <Field id="org-website" label="Website" value={form.website} onChange={set("website")} />

          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create Organization"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
